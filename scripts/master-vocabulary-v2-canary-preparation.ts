import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type JsonRecord = Record<string, unknown>;
type Pin = JsonRecord & { recordPath: string };

const CANARY_SENSES = [
  { id: "01a0fc13-09ed-70b4-801b-408be3b771e9", purpose: "simple concrete noun; fruit" },
  { id: "01a0fc13-09ee-7211-8e5a-784c689a0c7a", purpose: "polysemy; financial institution" },
  { id: "01a0fc13-09ee-7584-a480-e313e359f744", purpose: "polysemy; river edge" },
  { id: "01a0fc13-09ee-71ff-9a0a-a96e48ef7dac", purpose: "same Lexeme as the verb; noun stress pattern" },
  { id: "01a0fc13-09ee-7823-95fc-5d1d76f13fa5", purpose: "same Lexeme as the noun; verb stress pattern" },
  { id: "01a0fc13-09ee-79c7-85ff-cbe0fc14a249", purpose: "phrasal verb" },
  { id: "01a0fc13-09ef-710c-8e76-753a5cfea69c", purpose: "technical domain; algorithm" },
  { id: "01a0fc13-09ef-7d37-a50f-d05db6b1a89c", purpose: "travel and hospitality; reservation" },
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function object(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function objects(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function localizedText(value: unknown, language: string): string | null {
  const match = objects(value).find((entry) => entry.language === language);
  return string(match?.text) ?? string(objects(value)[0]?.text);
}

function readJson(root: string, path: string): JsonRecord {
  const parsed: unknown = JSON.parse(readFileSync(join(root, ...path.split("/")), "utf8"));
  if (!isRecord(parsed)) throw new Error(`CANARY_JSON_OBJECT_REQUIRED:${path}`);
  return parsed;
}

function pins(manifest: JsonRecord, property: string): Pin[] {
  return objects(manifest[property]).filter((pin): pin is Pin => typeof pin.recordPath === "string");
}

function pinById(pinsToSearch: Pin[], idField: string, id: string): Pin | undefined {
  return pinsToSearch.find((pin) => pin[idField] === id);
}

function refIds(value: unknown): string[] {
  const ids = new Set<string>();
  const visit = (entry: unknown): void => {
    if (Array.isArray(entry)) {
      for (const child of entry) visit(child);
      return;
    }
    if (!isRecord(entry)) return;
    for (const [key, child] of Object.entries(entry)) {
      if (key === "provenanceIds" || key === "sourceProvenanceIds") {
        for (const id of Array.isArray(child) ? child : []) if (typeof id === "string") ids.add(id);
      } else if (key === "addedByProvenanceId" && typeof child === "string") {
        ids.add(child);
      } else {
        visit(child);
      }
    }
  };
  visit(value);
  return [...ids].sort();
}

function markdownCell(value: unknown): string {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function sortedPins(found: Array<Pin | undefined>, idField: string): Pin[] {
  const unique = new Map<string, Pin>();
  for (const pin of found) if (pin) unique.set(String(pin[idField]), pin);
  return [...unique.values()].sort((left, right) => String(left[idField]).localeCompare(String(right[idField])));
}

export interface CanaryPreparationArtifacts {
  reviewMarkdown: string;
  ownerApprovalTemplateJson: string;
  reconciliationCandidatesJson: string;
  releasePlanJson: string;
}

export function buildMasterVocabularyV2CanaryArtifacts(datasetRoot: string): CanaryPreparationArtifacts {
  const manifest = readJson(datasetRoot, "dataset.json");
  const sensePins = pins(manifest, "includedSenses");
  const lexemePins = pins(manifest, "includedLexemes");
  const classificationPins = pins(manifest, "includedClassifications");
  const setPins = pins(manifest, "includedLearningSets");
  const provenancePins = pins(manifest, "includedProvenance");
  const mediaPins = pins(manifest, "includedMediaAssets");
  const versionPins = objects(manifest.includedMediaAssetVersions);
  const preview = readJson(datasetRoot, "import/vocabulary-import-v2.json");
  const topicPreview = readJson(datasetRoot, "import/topics-import-v2.json");
  const taxonomyPin = objects(manifest.includedTaxonomySnapshots)[0];
  const taxonomy = taxonomyPin ? readJson(datasetRoot, String(taxonomyPin.recordPath)) : {};
  const projectionRecords = objects(preview.records);
  const topicRecords = objects(topicPreview.records);

  const candidates = CANARY_SENSES.map((spec) => {
    const sensePin = pinById(sensePins, "masterSenseId", spec.id);
    if (!sensePin) throw new Error(`CANARY_SENSE_NOT_PINNED:${spec.id}`);
    const sense = readJson(datasetRoot, sensePin.recordPath);
    const lexemeId = string(sense.masterLexemeId);
    const lexemePin = lexemeId ? pinById(lexemePins, "masterLexemeId", lexemeId) : undefined;
    if (!lexemePin) throw new Error(`CANARY_LEXEME_NOT_PINNED:${spec.id}`);
    const lexeme = readJson(datasetRoot, lexemePin.recordPath);
    const projection = projectionRecords.find((record) => record.masterSenseId === spec.id);
    if (!projection) throw new Error(`CANARY_PREVIEW_PROJECTION_MISSING:${spec.id}`);
    const runtime = object(projection.runtimeProjection);
    const translations = objects(sense.translations);
    const translation = translations.find((entry) => entry.language === "vi" && entry.isPreferred === true) ?? translations.find((entry) => entry.language === "vi");
    const definitions = objects(sense.definitions);
    const definition = definitions.find((entry) => entry.language === "en") ?? definitions[0];
    const examples = objects(sense.examples);
    const example = examples.find((entry) => entry.language === "en") ?? examples[0];
    const exampleTranslation = objects(example?.exampleTranslations).find((entry) => entry.language === "vi" && entry.isPreferred === true)
      ?? objects(example?.exampleTranslations).find((entry) => entry.language === "vi");
    const pronunciations = [...objects(sense.pronunciationOverrides), ...objects(lexeme.pronunciations)];
    const selectedIpa = string(runtime.ipa);
    const selectedPronunciation = selectedIpa === null
      ? undefined
      : objects(sense.pronunciationOverrides).find((entry) => entry.isPreferred === true && entry.locale === "en-US" && entry.ipa === selectedIpa)
        ?? objects(lexeme.pronunciations).find((entry) => entry.isPreferred === true && entry.locale === "en-US" && entry.ipa === selectedIpa);
    const pronunciationSource = selectedIpa === null
      ? "none selected"
      : objects(sense.pronunciationOverrides).some((entry) => entry.isPreferred === true && entry.locale === "en-US" && entry.ipa === selectedIpa)
        ? "Sense override"
        : "Lexeme pronunciation";
    const senseClasses = classificationPins.map((pin) => readJson(datasetRoot, pin.recordPath))
      .filter((classification) => classification.masterSenseId === spec.id);
    const topicClass = senseClasses.find((classification) => classification.dimension === "TOPIC" && classification.isPrimary === true)
      ?? senseClasses.find((classification) => classification.dimension === "TOPIC");
    const cefr = senseClasses.find((classification) => classification.dimension === "CEFR" && classification.isPrimary === true)
      ?? senseClasses.find((classification) => classification.dimension === "CEFR");
    const difficulty = senseClasses.find((classification) => classification.dimension === "DIFFICULTY" && classification.isPrimary === true)
      ?? senseClasses.find((classification) => classification.dimension === "DIFFICULTY");
    const domainClasses = senseClasses.filter((classification) => classification.dimension === "DOMAIN");
    const topicRef = string(topicClass?.valueRef);
    const topic = topicRecords.find((record) => record.masterTopicId === topicRef);
    const domainEntities = objects(taxonomy.domains);
    const domains = domainClasses.map((entry) => {
      const domain = domainEntities.find((candidate) => candidate.domainId === entry.valueRef);
      return {
        code: string(domain?.code),
        label: localizedText(domain?.labels, "en"),
        status: string(entry.status),
      };
    }).sort((left, right) => String(left.code).localeCompare(String(right.code)));
    const media = mediaPins.map((pin) => readJson(datasetRoot, pin.recordPath))
      .filter((asset) => asset.targetEntityType === "SENSE" && asset.targetId === spec.id)
      .map((asset) => ({ mediaKind: string(asset.mediaKind), status: string(asset.status), mediaAssetId: string(asset.mediaAssetId) }));
    const usedProvenanceIds = refIds([lexeme, sense]);
    const usedProvenancePins = sortedPins(usedProvenanceIds.map((id) => pinById(provenancePins, "provenanceId", id)), "provenanceId");
    const provenanceRecords = usedProvenancePins.map((pin) => readJson(datasetRoot, pin.recordPath));
    const provenanceTypes = [...new Set(provenanceRecords.map((record) => string(record.sourceType) ?? "unknown"))].sort();
    const contentStatuses = [lexeme.status, sense.status, translation?.status, definition?.status, example?.status, exampleTranslation?.status]
      .filter((status): status is string => typeof status === "string");
    const currentReviewStatuses = [...new Set(contentStatuses)].sort().join(", ") || "not recorded";
    const exampleText = string(example?.text);
    const contentProvenanceStatus = `${usedProvenanceIds.length} source references; ${usedProvenancePins.length} exact Provenance pins resolve; sources still need owner review`;
    const issues = [
      "Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY.",
      "Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release.",
      media.some((asset) => asset.status === "PLANNED") ? "Media remains PLANNED; runtime media projection is null and no delivery may be assumed." : "Confirm that absent or pending media behavior is acceptable.",
      "CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met.",
      "Domain assignments are editorial pilot metadata and are omitted from the minimal approved release.",
      string(runtime.topic) ? "Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot." : "No legacy Topic projection is available in this preview.",
      selectedIpa ? `Verify the ${pronunciationSource.toLowerCase()} IPA and dialect/stress before publication.` : pronunciations.length > 0 ? "Review pronunciation records; no pronunciation was selected by this projection." : "No selected IPA is available; decide whether text-only pronunciation is acceptable.",
    ];

    return {
      ...spec,
      sense,
      senseLabel: localizedText(sense.senseLabel, "en"),
      partOfSpeechCode: string(sense.partOfSpeechCode),
      sensePin,
      lexeme,
      lexemePin,
      lexicalUnitType: string(lexeme.lexicalUnitType),
      runtime,
      translation,
      definition,
      exampleText,
      exampleTranslation,
      pronunciation: { ipa: selectedIpa, source: pronunciationSource },
      topic: { name: string(runtime.topic), masterTopicId: topicRef, code: string(topic?.code), status: string(topicClass?.status) },
      level: string(runtime.level),
      cefr: { estimate: string(cefr?.valueCode), status: string(cefr?.status), confidence: cefr?.confidence },
      difficulty: { estimate: difficulty?.numericValue, scaleId: string(difficulty?.scaleId), status: string(difficulty?.status) },
      classifications: senseClasses.map((classification) => ({
        classificationId: string(classification.classificationId),
        dimension: string(classification.dimension),
        value: classification.valueCode ?? classification.valueRef ?? classification.numericValue ?? null,
        status: string(classification.status),
      })).sort((left, right) => String(left.dimension).localeCompare(String(right.dimension)) || String(left.classificationId).localeCompare(String(right.classificationId))),
      domains,
      media,
      selectedPronunciationId: string(selectedPronunciation?.pronunciationId),
      usedProvenanceIds,
      usedProvenancePins,
      provenanceTypes,
      contentProvenanceStatus,
      currentReviewStatuses,
      issues,
    };
  });

  const candidateIds = new Set<string>(candidates.map((candidate) => candidate.id));
  const setRecords = setPins.map((pin) => ({ pin, record: readJson(datasetRoot, pin.recordPath) }));
  const touchingSets = setRecords.filter(({ record }) => objects(record.items).some((item) => candidateIds.has(String(item.masterSenseId))));
  const canarySets = touchingSets.filter(({ record }) => record.code === "TECHNOLOGY_STARTER"
    && objects(record.items).every((item) => candidateIds.has(String(item.masterSenseId))));
  const requiredLexemePins = sortedPins(candidates.map((candidate) => candidate.lexemePin), "masterLexemeId");
  const requiredProvenanceIds = [...new Set([
    ...candidates.flatMap((candidate) => candidate.usedProvenanceIds),
    ...canarySets.flatMap(({ record }) => refIds(record)),
  ])].sort();
  const requiredProvenancePins = sortedPins(requiredProvenanceIds.map((id) => pinById(provenancePins, "provenanceId", id)), "provenanceId");
  if (requiredProvenancePins.length !== requiredProvenanceIds.length) throw new Error("CANARY_PROVENANCE_PIN_CLOSURE_INCOMPLETE");
  const selectedTopicClasses = classificationPins.map((pin) => readJson(datasetRoot, pin.recordPath))
    .filter((classification) => candidateIds.has(String(classification.masterSenseId)) && classification.dimension === "TOPIC");
  const optionalTopicPinIds = [...new Set(selectedTopicClasses.map((classification) => classification.classificationId).filter((id): id is string => typeof id === "string"))].sort();
  const optionalTopicPins = sortedPins(optionalTopicPinIds.map((id) => pinById(classificationPins, "classificationId", id)), "classificationId");
  const optionalTopicIds = [...new Set(selectedTopicClasses.map((classification) => classification.valueRef).filter((id): id is string => typeof id === "string"))].sort();
  const optionalTopicRecords = optionalTopicIds.map((id) => topicRecords.find((record) => record.masterTopicId === id))
    .filter((record): record is JsonRecord => Boolean(record))
    .sort((left, right) => String(left.masterTopicId).localeCompare(String(right.masterTopicId)))
    .map((record) => ({ masterTopicId: record.masterTopicId, code: record.code, slug: record.slug, name: record.name }));
  const optionalTopicProvenanceIds = [...new Set(selectedTopicClasses.flatMap((classification) => strings(classification.sourceProvenanceIds)))].sort();
  const optionalTopicProvenancePins = sortedPins(optionalTopicProvenanceIds.map((id) => pinById(provenancePins, "provenanceId", id)), "provenanceId");
  const setClosure = touchingSets.map(({ pin, record }) => ({
    learningSetId: string(pin.learningSetId),
    code: string(record.code),
    unselectedSenseIds: [...new Set(objects(record.items).map((item) => string(item.masterSenseId)).filter((id): id is string => Boolean(id) && !candidateIds.has(id as string)))].sort(),
  })).sort((left, right) => String(left.learningSetId).localeCompare(String(right.learningSetId)));
  const mediaRecords = mediaPins.map((pin) => ({ pin, asset: readJson(datasetRoot, pin.recordPath) }))
    .filter(({ asset }) => asset.targetEntityType === "SENSE" && candidateIds.has(String(asset.targetId)));
  const requiredMediaIds = mediaRecords.filter(({ asset }) => asset.status === "APPROVED")
    .map(({ asset }) => string(asset.mediaAssetId)).filter((id): id is string => Boolean(id)).sort();
  const pinnedVersionIds = new Set(versionPins.map((pin) => `${String(pin.mediaAssetId)}@${String(pin.mediaAssetVersion)}`));
  const includedMediaIds = new Set(requiredMediaIds.filter((id) => pinnedVersionIds.has(`${id}@${String(mediaRecords.find(({ asset }) => asset.mediaAssetId === id)?.asset.currentMediaAssetVersion)}`)));

  const sourceHash = createHash("sha256").update(readFileSync(join(datasetRoot, "dataset.json"))).digest("hex");
  const approvalTemplate = {
    artifactVersion: "vocabflow-master-v2-canary-owner-approval-v1",
    status: "OWNER_INPUT_REQUIRED",
    sourceDataset: {
      datasetId: manifest.datasetId,
      datasetVersion: manifest.datasetVersion,
      schemaVersion: manifest.schemaVersion,
      manifestStatus: manifest.status,
      manifestRawSha256: sourceHash,
    },
    proposedRelease: {
      datasetVersion: "2.1.0",
      semverBump: "MINOR",
      rationale: "First approved canary snapshot on the 2.0.x content line. The existing 2.0.0 snapshot remains DRAFT and immutable; the canary adds a new approved content snapshot without changing schemaVersion.",
    },
    releaseApproval: {
      decision: "PENDING",
      reviewer: null,
      reviewedAt: null,
      notes: "Explicit owner sign-off for this exact release snapshot is required.",
    },
    senseReviews: candidates.map((candidate) => ({
      masterSenseId: candidate.sense.masterSenseId,
      masterLexemeId: candidate.lexeme.masterLexemeId,
      sourceSenseRevision: candidate.sense.senseRevision,
      sourceSenseContentHash: candidate.sensePin.contentHash,
      decision: "PENDING",
      selectedChildIds: {
        translationId: candidate.translation?.translationId ?? null,
        definitionId: candidate.definition?.definitionId ?? null,
        exampleId: (candidate.sense.examples && objects(candidate.sense.examples).find((entry) => entry.language === "en")?.exampleId) ?? null,
        exampleTranslationId: candidate.exampleTranslation?.exampleTranslationId ?? null,
        pronunciationId: candidate.selectedPronunciationId,
      },
      fieldDecisions: {
        partOfSpeech: "PENDING",
        translation: "PENDING",
        definition: "PENDING",
        example: "PENDING",
        exampleTranslation: "PENDING",
        pronunciation: "PENDING",
        mediaRuntimeUrls: "PENDING",
      },
      reviewer: null,
      reviewedAt: null,
      notes: "",
    })),
    lexemeReviews: requiredLexemePins.map((pin) => {
      const lexeme = readJson(datasetRoot, pin.recordPath);
      return {
        masterLexemeId: lexeme.masterLexemeId,
        sourceLexemeRevision: lexeme.lexemeRevision,
        sourceLexemeContentHash: pin.contentHash,
        decision: "PENDING",
        fieldDecisions: { lemma: "PENDING", lexicalUnitType: "PENDING", pronunciation: "PENDING" },
        reviewer: null,
        reviewedAt: null,
        notes: "",
      };
    }),
    learningSetReviews: canarySets.map(({ pin, record }) => ({
      learningSetId: record.learningSetId,
      sourceLearningSetRevision: record.learningSetRevision,
      sourceLearningSetContentHash: pin.contentHash,
      decision: "PENDING",
      fieldDecisions: { name: "PENDING", description: "PENDING", membership: "PENDING" },
      items: objects(record.items).map((item) => ({
        learningSetItemId: item.learningSetItemId,
        masterSenseId: item.masterSenseId,
        decision: "PENDING",
        reviewer: null,
        reviewedAt: null,
        notes: "",
      })),
      reviewer: null,
      reviewedAt: null,
      notes: "",
    })),
    reviewRule: "The tool accepts only explicit owner decisions. APPROVE requires every listed field to be APPROVED and a reviewer/date. REQUEST_CHANGES excludes that Sense from this canary until a reviewed immutable Master revision is supplied. EXCLUDE_FROM_CANARY omits a Sense. PENDING blocks release preparation.",
  };
  const reviewLines = [
    "# Canary content review — Master Vocabulary V2",
    "",
    "**Owner review only.** This package records a proposed subset from the current pinned DRAFT pilot. It does not approve content, change the manifest, choose runtime identities, or authorize an import.",
    "",
    `- Dataset: ${markdownCell(manifest.datasetCode)} ${markdownCell(manifest.datasetVersion)}; current manifest status: **${markdownCell(manifest.status)}**` ,
    `- Source manifest file SHA-256: \`${sourceHash}\``,
    `- Proposed review set: **${candidates.length} Senses** across **${requiredLexemePins.length} Lexemes**.`,
    "- No runtime target is available. Runtime progress/review counts, overrides, quarantine and contentVersion are unavailable; see the separate reconciliation candidates file.",
    "- All fields below are a source review aid. Experimental CEFR/difficulty values are explicitly editorial and non-official.",
    "- Topic/Level below show the full DRAFT PREVIEW projection. The proposed minimal APPROVED canary omits in-review classifications and the current DRAFT taxonomy, so its runtime Topic and Level would be null.",
    "",
    "## Review decisions",
    "",
    "Review each Sense and its exact selected child IDs below. Record the same decisions in `canary-owner-approval-v2.json`; the release tool accepts only that explicit JSON artifact.",
    "",
    "- `APPROVE` requires a reviewer, date, and APPROVED decisions for every learner-facing field.",
    "- `REQUEST_CHANGES` blocks that Sense from this canary until a reviewed immutable Master revision is supplied and the approval template is regenerated.",
    "- `EXCLUDE_FROM_CANARY` omits that Sense; `PENDING` blocks release preparation.",
    "- Complete `releaseApproval` at the end of `canary-owner-approval-v2.json` only after reviewing the exact selected subset; it is the release-level approval and supplies `releasedAt`.",
    "- `2.1.0` is a MINOR content release: the 2.0.0 DRAFT history is preserved, the schema is unchanged, and a new approved canary snapshot is created.",
    "- Lexeme identity and pronunciation, and any included Learning Set and item, require separate explicit review because the APPROVED manifest pins those records too.",
    "",
    "## Proposed Learning Set canary",
    "",
    ...canarySets.flatMap(({ pin, record }) => [
      `- [ ] Review **${markdownCell(localizedText(record.name, "en"))}** (\`${markdownCell(record.code)}\`, \`${markdownCell(pin.learningSetId)}\`), currently ${markdownCell(record.status)}. Its exact revision contains ${objects(record.items).length} item(s), all already in the proposed Sense subset.`,
      `  - Decision: [ ] APPROVE [ ] REQUEST CHANGES [ ] EXCLUDE FROM CANARY; review name [ ] description [ ] membership [ ]; reviewer: __________; date: __________.`,
      ...objects(record.items).map((item) => `  - Item \`${markdownCell(item.learningSetItemId)}\`: Sense \`${markdownCell(item.masterSenseId)}\`, position ${markdownCell(item.position)}, status ${markdownCell(item.status)}; decision [ ] APPROVE [ ] EXCLUDE.`),
      "  - Selection Provenance is pinned in the dependency plan; PLANNED media remains outside runtime URLs.",
    ]),
    "- Other Learning Sets that intersect these Senses are excluded because their pinned revisions would add non-canary Senses.",
    "",
  ];

  for (const candidate of candidates) {
    const cefr = candidate.cefr.estimate ? `${candidate.cefr.estimate} — editorial estimate, non-official (${candidate.cefr.status ?? "status unavailable"})` : "not assigned";
    const difficulty = candidate.difficulty.estimate === undefined
      ? "not assigned"
      : `${String(candidate.difficulty.estimate)} on ${candidate.difficulty.scaleId ?? "unresolved scale"} — editorial estimate, non-official (${candidate.difficulty.status ?? "status unavailable"})`;
    const domain = candidate.domains.length === 0
      ? "not assigned"
      : `${candidate.domains.map((entry) => `${entry.label ?? entry.code ?? "unresolved"} (${entry.status ?? "status unavailable"})`).join(", ")} — editorial pilot metadata, omitted from the proposed release`;
    const mediaSummary = candidate.media.length === 0 ? "no pinned Sense-target media record" : candidate.media.map((asset) => `${asset.mediaKind}: ${asset.status}`).join("; ");
    const imageStatus = candidate.media.filter((asset) => asset.mediaKind === "IMAGE").map((asset) => asset.status).join(", ") || "no image slot";
    const audioStatus = candidate.media.filter((asset) => asset.mediaKind === "WORD_PRONUNCIATION_AUDIO" || asset.mediaKind === "EXAMPLE_AUDIO").map((asset) => `${asset.mediaKind}: ${asset.status}`).join(", ") || "no audio slot";
    const metadataValues = (dimensions: string[]) => candidate.classifications
      .filter((entry) => dimensions.includes(String(entry.dimension)))
      .map((entry) => `${String(entry.value ?? "unresolved")} (${entry.status ?? "status unavailable"})`)
      .join(", ") || "not assigned";
    reviewLines.push(
      `### ${markdownCell(candidate.senseLabel ?? candidate.lexeme.lemma)} — ${markdownCell(candidate.lexeme.lemma)} (${markdownCell(candidate.partOfSpeechCode)})`,
      "",
      `- Purpose: ${candidate.purpose}.`,
      `- Identity: lemma \`${markdownCell(candidate.lexeme.lemma)}\`; masterLexemeId \`${markdownCell(candidate.lexeme.masterLexemeId)}\`; masterSenseId \`${markdownCell(candidate.sense.masterSenseId)}\`; POS \`${markdownCell(candidate.partOfSpeechCode)}\`; lexicalUnitType \`${markdownCell(candidate.lexicalUnitType)}\`.`,
      `- Vietnamese translation: ${markdownCell(objects(candidate.sense.translations).find((entry) => entry.language === "vi" && entry.isPreferred === true)?.text ?? candidate.runtime.vietnamese)}`,
      `- Definition: ${markdownCell(candidate.definition?.text)}`,
      `- Example: ${markdownCell(candidate.exampleText)}`,
      `- Example translation: ${markdownCell(candidate.exampleTranslation?.text)}`,
      `- Selected IPA: ${candidate.pronunciation.ipa ? `\`${markdownCell(candidate.pronunciation.ipa)}\` (${candidate.pronunciation.source})` : "none"}`,
      `- Legacy Topic (full DRAFT preview): ${markdownCell(candidate.runtime.topic)}; Level (full DRAFT preview): ${markdownCell(candidate.level)}. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.`,
      `- Media: image ${markdownCell(imageStatus)}; audio ${markdownCell(audioStatus)}; runtime imageUrl: null; runtime audioUrl: null. ${markdownCell(mediaSummary)}.`,
      `- CEFR: EDITORIAL / NON-OFFICIAL — ${markdownCell(cefr)}; difficulty: EDITORIAL / NON-OFFICIAL — ${markdownCell(difficulty)}. Neither is an official learner claim.`,
      `- Domains: EDITORIAL / NON-OFFICIAL — ${markdownCell(domain)}.`,
      `- Audience / age group: EDITORIAL / NON-OFFICIAL — ${markdownCell(metadataValues(["AGE_GROUP", "AUDIENCE"]))}.`,
      `- Exam / curriculum: EDITORIAL / NON-OFFICIAL — ${markdownCell(metadataValues(["EXAM", "CURRICULUM"]))}.`,
      `- Selected pronunciation ID: \`${markdownCell(candidate.selectedPronunciationId)}\` (approve text/absence explicitly; audio URL stays null).`,
      `- Provenance: ${markdownCell(candidate.contentProvenanceStatus)} (${markdownCell(candidate.provenanceTypes.join(", ")) || "no source type"}).`,
      `- Current review status: Lexeme ${markdownCell(candidate.lexeme.status)}; selected content ${markdownCell(candidate.currentReviewStatuses)}.`,
      `- Human review required: ${markdownCell(candidate.issues.join(" "))}`,
      `- Exact selected IDs: Translation \`${markdownCell(candidate.translation?.translationId)}\`; Definition \`${markdownCell(candidate.definition?.definitionId)}\`; Example \`${markdownCell(candidate.sense.examples && objects(candidate.sense.examples).find((entry) => entry.language === "en")?.exampleId)}\`; Example Translation \`${markdownCell(candidate.exampleTranslation?.exampleTranslationId)}\`.`,
      "- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY",
      "- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.",
      "- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.",
      "- Reviewer: ____________________    Date: ____________________",
      "- Notes: ____________________________________________________________________",
      "",
    );
  }

  const candidateRows = candidates.map((candidate) => ({
    masterLexemeId: candidate.lexeme.masterLexemeId,
    masterSenseId: candidate.sense.masterSenseId,
    lemma: candidate.lexeme.lemma,
    normalizedLemma: candidate.lexeme.normalizedLemma,
    effectiveVietnameseSearchSignal: candidate.runtime.vietnamese,
    definitionSearchSignal: candidate.runtime.definitionEn,
      exampleSearchSignal: candidate.runtime.exampleEn,
      currentTopicSearchSignal: candidate.runtime.topic,
      masterRuntimeProjection: {
        word: candidate.lexeme.lemma,
        ipa: candidate.runtime.ipa,
        vietnamese: candidate.runtime.vietnamese,
        definitionEn: candidate.runtime.definitionEn,
        exampleEn: candidate.runtime.exampleEn,
        imageUrl: null,
        audioUrl: null,
        topic: null,
        level: null,
        enabled: true,
      },
    searchSignalsAreNotIdentity: true,
    runtimeCandidateSearchPerformed: false,
    runtimeCandidates: [],
    decision: "UNRESOLVED",
    allowedFutureDecisions: ["MAP_EXISTING", "CREATE_NEW", "SKIP"],
    runtimeVisibility: {
      state: "UNAVAILABLE_NO_TARGET",
      learnerProgressReferenceCount: null,
      reviewEventReferenceCount: null,
      contentVersion: null,
      currentEffectiveVietnamese: null,
      vietnameseOverride: null,
      imageQuarantined: null,
      enabled: null,
      sourceDataset: null,
      sourceRecordId: null,
    },
  }));
  const candidatesArtifact = {
    artifactVersion: "runtime-reconciliation-candidates-v2",
    analysisOnly: true,
    humanDecisionFile: "runtime-reconciliation-v2.json",
    humanDecisionFileMayBeOverwritten: false,
    sourceDataset: { datasetId: manifest.datasetId, datasetVersion: manifest.datasetVersion, manifestStatus: manifest.status, rawManifestSha256: sourceHash },
    targetStatus: "NO_TARGET",
    runtimeSearchPerformed: false,
    similarityCanSelectIdentity: false,
    matchingSignalsAreDiscoveryHintsOnly: ["exact lemma", "normalized lemma", "effective Vietnamese", "definition/example similarity", "current Topic"],
    runtimeCandidateColumns: ["appVocabularyId", "word", "ipa", "baseVietnamese", "vietnameseOverride", "effectiveVietnamese", "definition", "example", "imageUrl", "imageQuarantined", "audioUrl", "legacyTopic", "level", "enabled", "contentVersion", "sourceDataset", "sourceRecordId", "learnerProgressReferenceCount", "reviewEventReferenceCount", "projectionDifferences"],
    progressVisibility: "Unavailable without a verified read-only runtime target; null counts are not zero counts.",
    decisionRule: "UNRESOLVED cannot be applied. A human must choose MAP_EXISTING, CREATE_NEW or SKIP after reviewing a verified runtime snapshot.",
    candidates: candidateRows,
  };

  const plan = {
    artifactVersion: "master-vocabulary-v2-canary-release-plan-v1",
    planStatus: "PROPOSED_NOT_PUBLISHED",
    sourceDataset: { datasetId: manifest.datasetId, datasetVersion: manifest.datasetVersion, schemaVersion: manifest.schemaVersion, currentStatus: manifest.status, rawManifestSha256: sourceHash },
    proposedRelease: {
      datasetVersion: "2.1.0",
      semverBump: "MINOR",
      rationale: "The 2.0.0 pilot remains an immutable DRAFT snapshot. The canary is a new approved learner-content snapshot; it does not change schemaVersion or recycle the DRAFT release identity.",
      onlyAfterExplicitOwnerApproval: true,
    },
    candidateSenseCount: candidates.length,
    proposedLearnerContentBoundary: {
      includedSensePins: sortedPins(candidates.map((candidate) => candidate.sensePin), "masterSenseId"),
      requiredLexemePins,
      requiredProvenancePins,
      includedClassificationPins: [],
      includedLearningSetPins: canarySets.map(({ pin }) => pin),
      includedLearningSetItemCount: canarySets.reduce((total, { record }) => total + objects(record.items).length, 0),
      includedTaxonomySnapshotPins: [],
      includedMediaAssetPins: [],
      includedMediaAssetVersionPins: [],
      includedRelationPins: [],
      topicAndLevelProjection: "omitted in the minimal learner-content subset unless an owner-reviewed approved taxonomy/classification branch is explicitly selected; runtime topic and level will then be null",
      mediaBehavior: "omit PLANNED/unapproved media; runtime image/audio URLs remain null; include a media slot/version only after exact APPROVED pins and a safe READY delivery exist",
    },
    optionalTopicBridge: {
      classificationPins: optionalTopicPins,
      provenancePins: optionalTopicProvenancePins,
      masterTopicIds: optionalTopicIds,
      runtimeTopicRecords: optionalTopicRecords,
      currentTopicClassificationStatuses: [...new Set(selectedTopicClasses.map((entry) => string(entry.status)))].sort(),
      currentTaxonomySnapshotStatus: string(taxonomy.status),
      blocker: "Topic classifications are IN_REVIEW and the current taxonomy snapshot is DRAFT; APPROVED release requires every included Classification and the pinned taxonomy snapshot to be APPROVED. Owner review or a separately governed taxonomy revision is required before including this optional branch.",
    },
    omittedExperimentalClassifications: classificationPins.map((pin) => readJson(datasetRoot, pin.recordPath))
      .filter((classification) => candidateIds.has(String(classification.masterSenseId)) && classification.dimension !== "TOPIC")
      .map((classification) => ({ classificationId: classification.classificationId, masterSenseId: classification.masterSenseId, dimension: classification.dimension, status: classification.status, valueCode: classification.valueCode ?? null, numericValue: classification.numericValue ?? null, sourceProvenanceIds: classification.sourceProvenanceIds ?? [] }))
      .sort((left, right) => String(left.classificationId).localeCompare(String(right.classificationId))),
    excludedLearningSetClosure: {
      excludedLearningSetPins: touchingSets.filter((candidate) => !canarySets.some((selected) => selected.pin.learningSetId === candidate.pin.learningSetId)).map(({ pin }) => pin),
      setsTouchingCandidates: setClosure,
      reason: "Only the TECHNOLOGY_STARTER Set is included because its exact pinned revision contains only the canary algorithm Sense. Other intersecting Sets are omitted because their revisions add unrelated pilot Senses.",
    },
    mediaReviewOnly: mediaRecords.map(({ pin, asset }) => ({ pin, mediaAssetId: asset.mediaAssetId, mediaKind: asset.mediaKind, status: asset.status, currentMediaAssetVersion: asset.currentMediaAssetVersion ?? null, includedVersionIsPinned: includedMediaIds.has(String(asset.mediaAssetId)) })),
    manifestRules: {
      approvedManifestRequiresReleaseHashAndReleasedAt: true,
      everyPinnedLexemeSenseClassificationLearningSetRelationMustBeApproved: true,
      pinnedTaxonomySnapshotMustBeApproved: true,
      approvedCEFRExamSchoolLevelClassificationRequiresProvenance: true,
      editorialIsNotAClassificationStatusValue: true,
      provenanceRulesRemainUnchanged: true,
      canonicalManifestMutation: "not performed; current dataset.json remains DRAFT",
      sourceReviewStatus: [...new Set(candidates.flatMap((candidate) => [candidate.lexeme.status, candidate.sense.status]))].sort(),
    },
  };

  return {
    reviewMarkdown: `${reviewLines.join("\n").trimEnd()}\n`,
    ownerApprovalTemplateJson: `${JSON.stringify(approvalTemplate, null, 2)}\n`,
    reconciliationCandidatesJson: `${JSON.stringify(candidatesArtifact, null, 2)}\n`,
    releasePlanJson: `${JSON.stringify(plan, null, 2)}\n`,
  };
}

export function writeMasterVocabularyV2CanaryArtifacts(repositoryRoot: string): void {
  const datasetRoot = join(repositoryRoot, "vocabflow-dataset");
  const artifacts = buildMasterVocabularyV2CanaryArtifacts(datasetRoot);
  writeFileSync(join(datasetRoot, "reports", "canary-content-review.md"), artifacts.reviewMarkdown);
  writeFileSync(join(datasetRoot, "reports", "canary-owner-approval-v2.json"), artifacts.ownerApprovalTemplateJson);
  writeFileSync(join(datasetRoot, "import", "mappings", "runtime-reconciliation-candidates-v2.json"), artifacts.reconciliationCandidatesJson);
  writeFileSync(join(datasetRoot, "reports", "canary-release-plan-v2.json"), artifacts.releasePlanJson);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/master-vocabulary-v2-canary-preparation.ts")) {
  writeMasterVocabularyV2CanaryArtifacts(process.cwd());
}
