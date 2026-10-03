import type { RuntimeSnapshot, RuntimeVocabulary } from "./master-vocabulary-v2-import-planner";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";

type JsonRecord = Record<string, unknown>;

export type ReadOnlyRuntimeVocabulary = RuntimeVocabulary & {
  sourceDataset?: string | null;
  sourceRecordId?: number | string | null;
};

export type ReadOnlySnapshot = Omit<RuntimeSnapshot, "vocabularies"> & {
  vocabularies: ReadOnlyRuntimeVocabulary[];
  learningSetAssignmentCounts?: Array<{ learningSetId: number; learnerAssignmentCount: number; activeLearnerAssignmentCount?: number }>;
  learnerProgressCounts?: Array<{ vocabularyId: number; referenceCount: number }>;
  reviewEventCounts?: Array<{ vocabularyId: number; referenceCount: number }>;
  appleIdentityAudit?: Record<string, unknown>;
};

export type MasterRuntimeCandidate = {
  masterLexemeId: string;
  masterSenseId: string;
  lemma: string;
  normalizedLemma: string;
  projection: {
    word: string;
    ipa: string | null;
    vietnamese: string;
    definitionEn: string | null;
    exampleEn: string | null;
    imageUrl: string | null;
    audioUrl: string | null;
    topic: string | null;
    level: string | null;
    enabled: boolean;
  };
};

export type MasterTopicCandidate = { masterTopicId: string; code: string; slug: string; name: string };
export type MasterLearningSetCandidate = { masterLearningSetId: string; code: string; slug: string; name: string };

export interface ReadOnlyReconciliationScanInput {
  snapshot: ReadOnlySnapshot;
  senses: MasterRuntimeCandidate[];
  topics?: MasterTopicCandidate[];
  learningSets?: MasterLearningSetCandidate[];
}

type SenseScanResult = {
  masterLexemeId: string;
  masterSenseId: string;
  lemma: string;
  masterProjection: MasterRuntimeCandidate["projection"];
  existingMasterSenseMapping: RuntimeSnapshot["vocabularyMappings"][number] | null;
  runtimeCandidateSearchPerformed: true;
  runtimeCandidates: JsonRecord[];
  decision: "UNRESOLVED";
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") : "";
}

function sameText(left: unknown, right: unknown): boolean {
  return normalize(left) !== "" && normalize(left) === normalize(right);
}

function normalizeSetKey(value: string): string {
  return normalize(value.replace(/[-_]+/g, " "));
}

function projectionDifferences(master: MasterRuntimeCandidate["projection"], runtime: ReadOnlyRuntimeVocabulary): Array<{ field: string; master: unknown; runtime: unknown }> {
  const effectiveImageUrl = runtime.imageQuarantined ? null : runtime.imageUrl;
  const effectiveVietnamese = runtime.vietnameseOverride ?? runtime.vietnamese;
  const values: Array<[string, unknown, unknown]> = [
    ["word", master.word, runtime.word],
    ["ipa", master.ipa, runtime.ipa],
    ["vietnamese", master.vietnamese, effectiveVietnamese],
    ["definitionEn", master.definitionEn, runtime.definitionEn],
    ["exampleEn", master.exampleEn, runtime.exampleEn],
    ["imageUrl", master.imageUrl, effectiveImageUrl],
    ["audioUrl", master.audioUrl, runtime.audioUrl],
    ["topic", master.topic, runtime.topic],
    ["level", master.level, runtime.level],
    ["enabled", master.enabled, runtime.enabled],
  ];
  return values.filter(([, masterValue, runtimeValue]) => masterValue !== runtimeValue)
    .map(([field, masterValue, runtimeValue]) => ({ field, master: masterValue, runtime: runtimeValue }));
}

function discoverySignals(candidate: MasterRuntimeCandidate, row: ReadOnlyRuntimeVocabulary): string[] {
  const effectiveVietnamese = row.vietnameseOverride ?? row.vietnamese;
  const signals: string[] = [];
  if (sameText(candidate.lemma, row.word)) signals.push("EXACT_WORD");
  if (sameText(candidate.normalizedLemma, normalize(row.word))) signals.push("NORMALIZED_WORD");
  if (sameText(candidate.projection.vietnamese, effectiveVietnamese)) signals.push("EXACT_EFFECTIVE_VIETNAMESE");
  if (sameText(candidate.projection.definitionEn, row.definitionEn)) signals.push("EXACT_DEFINITION");
  if (sameText(candidate.projection.exampleEn, row.exampleEn)) signals.push("EXACT_EXAMPLE");
  if (sameText(candidate.projection.topic, row.topic)) signals.push("EXACT_CURRENT_TOPIC");
  return [...new Set(signals)];
}

function classifyCandidate(
  master: MasterRuntimeCandidate,
  matchingSignals: string[],
  differences: Array<{ field: string; master: unknown; runtime: unknown }>,
  existingMasterSenseMapping: RuntimeSnapshot["vocabularyMappings"][number] | null,
): "EXACT_EFFECTIVE_MATCH" | "PARTIAL_MATCH" | "SEMANTIC_CANDIDATE" | "CONFLICTING_MEANING" {
  if (existingMasterSenseMapping && existingMasterSenseMapping.masterSenseId !== master.masterSenseId) return "CONFLICTING_MEANING";
  if (differences.length === 0) return "EXACT_EFFECTIVE_MATCH";
  const sameLemma = matchingSignals.includes("EXACT_WORD") || matchingSignals.includes("NORMALIZED_WORD");
  if (sameLemma) return "PARTIAL_MATCH";
  return "SEMANTIC_CANDIDATE";
}

function referenceCountMap(
  aggregate: Array<{ vocabularyId: number; referenceCount: number }> | undefined,
  ids: number[],
): Map<number, number> {
  if (aggregate) return new Map(aggregate.map((row) => [row.vocabularyId, row.referenceCount]));
  const result = new Map<number, number>();
  for (const id of ids) result.set(id, (result.get(id) ?? 0) + 1);
  return result;
}

/**
 * Pure discovery over a snapshot supplied by a separately verified read-only adapter.
 * It never chooses a mapping decision and never mutates the supplied snapshot.
 */
export function scanMasterVocabularyV2ReadOnlySnapshot(input: ReadOnlyReconciliationScanInput): JsonRecord {
  const progressCount = referenceCountMap(input.snapshot.learnerProgressCounts, input.snapshot.progressVocabularyIds);
  const reviewCount = referenceCountMap(input.snapshot.reviewEventCounts, input.snapshot.reviewVocabularyIds);
  const mappingBySense = new Map(input.snapshot.vocabularyMappings.map((mapping) => [mapping.masterSenseId, mapping]));
  const mappingByAppId = new Map(input.snapshot.vocabularyMappings.map((mapping) => [mapping.vocabularyId, mapping]));

  const candidateRows: SenseScanResult[] = input.senses.map((master) => {
    const masterMapping = mappingBySense.get(master.masterSenseId) ?? null;
    const runtimeCandidates: JsonRecord[] = input.snapshot.vocabularies.flatMap((runtime) => {
      const matchingSignals = discoverySignals(master, runtime);
      if (matchingSignals.length === 0) return [];
      const differences = projectionDifferences(master.projection, runtime);
      const existingMasterSenseMapping = mappingByAppId.get(runtime.id) ?? null;
      const vietnameseOverrideStatus = runtime.vietnameseOverride === null
        ? "NONE"
        : sameText(runtime.vietnameseOverride, master.projection.vietnamese) ? "MATCHES_MASTER" : "CONFLICTS_WITH_MASTER";
      const imageQuarantineStatus = !runtime.imageQuarantined
        ? "FALSE"
        : master.projection.imageUrl === null ? "TRUE_NO_MASTER_IMAGE" : "TRUE_CONFLICT";
      const candidateClassification = classifyCandidate(master, matchingSignals, differences, existingMasterSenseMapping);
      return [{
        appVocabularyId: runtime.id,
        word: runtime.word,
        ipa: runtime.ipa,
        vietnamese: runtime.vietnamese,
        baseVietnamese: runtime.vietnamese,
        vietnameseOverride: runtime.vietnameseOverride,
        effectiveVietnamese: runtime.vietnameseOverride ?? runtime.vietnamese,
        definitionEn: runtime.definitionEn,
        definition: runtime.definitionEn,
        exampleEn: runtime.exampleEn,
        example: runtime.exampleEn,
        imageUrl: runtime.imageUrl,
        imageQuarantined: runtime.imageQuarantined,
        effectiveImageUrl: runtime.imageQuarantined ? null : runtime.imageUrl,
        audioUrl: runtime.audioUrl,
        topic: runtime.topic,
        legacyTopic: runtime.topic,
        level: runtime.level,
        enabled: runtime.enabled,
        contentVersion: runtime.contentVersion,
        sourceDataset: runtime.sourceDataset ?? null,
        sourceRecordId: runtime.sourceRecordId ?? null,
        learnerProgressCount: progressCount.get(runtime.id) ?? 0,
        learnerProgressReferenceCount: progressCount.get(runtime.id) ?? 0,
        reviewEventCount: reviewCount.get(runtime.id) ?? 0,
        reviewEventReferenceCount: reviewCount.get(runtime.id) ?? 0,
        existingMasterSenseMapping: existingMasterSenseMapping ? {
          masterSenseId: existingMasterSenseMapping.masterSenseId,
          masterLexemeId: existingMasterSenseMapping.masterLexemeId,
          appVocabularyId: existingMasterSenseMapping.vocabularyId,
          appliedProjectionFingerprint: existingMasterSenseMapping.appliedProjectionFingerprint,
          projectionContractVersion: existingMasterSenseMapping.projectionContractVersion,
          lastReleaseHash: existingMasterSenseMapping.lastReleaseHash,
        } : null,
        masterSenseMapping: masterMapping ? {
          masterSenseId: masterMapping.masterSenseId,
          masterLexemeId: masterMapping.masterLexemeId,
          appVocabularyId: masterMapping.vocabularyId,
          appliedProjectionFingerprint: masterMapping.appliedProjectionFingerprint,
          projectionContractVersion: masterMapping.projectionContractVersion,
          lastReleaseHash: masterMapping.lastReleaseHash,
        } : null,
        matchingSignals,
        projectionEqualsMaster: differences.length === 0,
        candidateClassification,
        vietnameseOverrideStatus,
        imageQuarantineStatus,
        firstAdoptionAnalysis: masterMapping
          ? "EXISTING_MAPPING_ALREADY_PRESENT"
          : existingMasterSenseMapping && existingMasterSenseMapping.masterSenseId !== master.masterSenseId
            ? "IDENTITY_REVIEW_REQUIRED"
            : differences.length === 0
              ? "POSSIBLE_ADOPT_EXISTING_AS_BASELINE"
              : matchingSignals.some((signal) => ["EXACT_EFFECTIVE_VIETNAMESE", "EXACT_DEFINITION", "EXACT_EXAMPLE"].includes(signal))
                ? "WOULD_REQUIRE_UPDATE_TO_MASTER" : "IDENTITY_REVIEW_REQUIRED",
        firstAdoptionPolicy: null,
        firstAdoptionReview: differences.length === 0 ? "POSSIBLE_BASELINE_AFTER_OWNER_REVIEW" : "DRIFT_REVIEW_REQUIRED",
        projectionDifferences: differences,
        decision: "UNRESOLVED",
      }];
    });
    return {
      masterLexemeId: master.masterLexemeId,
      masterSenseId: master.masterSenseId,
      lemma: master.lemma,
      masterProjection: master.projection,
      existingMasterSenseMapping: masterMapping,
      runtimeCandidateSearchPerformed: true,
      runtimeCandidates,
      decision: "UNRESOLVED",
    };
  });

  const candidateOwners = new Map<number, string[]>();
  for (const row of candidateRows) {
    const masterSenseId = String(row.masterSenseId);
    const candidates = Array.isArray(row.runtimeCandidates) ? row.runtimeCandidates as JsonRecord[] : [];
    for (const candidate of candidates) {
      const id = Number(candidate.appVocabularyId);
      const owners = candidateOwners.get(id) ?? [];
      owners.push(masterSenseId);
      candidateOwners.set(id, owners);
    }
  }
  for (const row of candidateRows) {
    const candidates = Array.isArray(row.runtimeCandidates) ? row.runtimeCandidates as JsonRecord[] : [];
    row.runtimeCandidates = candidates.map((candidate) => {
      const owners = candidateOwners.get(Number(candidate.appVocabularyId)) ?? [];
      const uniqueOwners = [...new Set(owners)].sort();
      const polysemyAmbiguous = uniqueOwners.length > 1;
      const mapping = candidate.existingMasterSenseMapping as { masterSenseId?: string } | null;
      const mappingConflict = Boolean(mapping && mapping.masterSenseId !== row.masterSenseId);
      const reconciliationFlags = [
        ...(polysemyAmbiguous ? ["AMBIGUOUS_RUNTIME_IDENTITY"] : []),
        ...(mappingConflict ? ["EXISTING_MAPPING_IDENTITY_CONFLICT"] : []),
      ];
      return {
        ...candidate,
        sameRuntimeIdCandidateForMasterSenses: uniqueOwners,
        polysemyAmbiguous,
        reconciliationFlags,
        firstAdoptionAnalysis: polysemyAmbiguous || mappingConflict ? "IDENTITY_REVIEW_REQUIRED" : candidate.firstAdoptionAnalysis,
      };
    });
  }

  const topicRows = (input.topics ?? []).map((master) => {
    const topicCandidates = input.snapshot.topics.filter((runtime) => sameText(runtime.slug, master.slug) || sameText(runtime.name, master.name))
      .map((runtime) => ({ appTopicId: runtime.id, slug: runtime.slug, name: runtime.name, enabled: runtime.enabled, slugCollision: sameText(runtime.slug, master.slug) }));
    return { ...master, decision: "UNRESOLVED", runtimeCandidates: topicCandidates };
  });
  const assignmentCounts = new Map((input.snapshot.learningSetAssignmentCounts ?? []).map((row) => [row.learningSetId, row.learnerAssignmentCount]));
  const activeAssignmentCounts = new Map((input.snapshot.learningSetAssignmentCounts ?? []).map((row) => [row.learningSetId, row.activeLearnerAssignmentCount ?? null]));
  const learningSetRows = (input.learningSets ?? []).map((master) => {
    const runtimeCandidates = input.snapshot.learningSets.flatMap((runtime) => {
      const matchingSignals = [
        ...(sameText(normalizeSetKey(runtime.slug), normalizeSetKey(master.slug)) ? ["NORMALIZED_SLUG_MATCH"] : []),
        ...(sameText(runtime.name, master.name) ? ["NORMALIZED_NAME_MATCH"] : []),
        ...(sameText(normalizeSetKey(runtime.slug), normalizeSetKey(master.code)) || sameText(normalizeSetKey(runtime.name), normalizeSetKey(master.code)) ? ["MASTER_CODE_MATCH"] : []),
      ];
      if (matchingSignals.length === 0) return [];
      return [{
        appLearningSetId: runtime.id,
        slug: runtime.slug,
        name: runtime.name,
        enabled: runtime.enabled,
        sortOrder: runtime.sortOrder,
        matchingSignals,
        learnerAssignmentCount: assignmentCounts.get(runtime.id) ?? null,
        activeLearnerAssignmentCount: activeAssignmentCounts.get(runtime.id) ?? null,
        memberships: input.snapshot.learningSetItems.filter((item) => item.learningSetId === runtime.id).map((item) => ({ vocabularyId: item.vocabularyId, sortOrder: item.sortOrder })),
        masterMemberships: input.snapshot.masterLearningSetMemberships.filter((item) => item.learningSetId === runtime.id),
        slugCollision: sameText(runtime.slug, master.slug),
        nameMatch: sameText(runtime.name, master.name),
        existingMasterLearningSetMapping: input.snapshot.learningSetMappings.find((mapping) => mapping.learningSetId === runtime.id) ?? null,
        reconciliationFlags: input.snapshot.learningSetMappings.some((mapping) => mapping.learningSetId === runtime.id && mapping.masterLearningSetId !== master.masterLearningSetId)
          ? ["EXISTING_MAPPING_IDENTITY_CONFLICT"]
          : [],
        decision: "UNRESOLVED",
      }];
    });
    return {
      ...master,
      decision: "UNRESOLVED",
      runtimeLearningSetCount: input.snapshot.learningSets.length,
      runtimeCandidateSearchPerformed: true,
      existingMasterLearningSetMapping: input.snapshot.learningSetMappings.find((mapping) => mapping.masterLearningSetId === master.masterLearningSetId) ?? null,
      runtimeCandidates,
    };
  });

  return {
    artifactVersion: "runtime-reconciliation-candidates-v2",
    analysisOnly: true,
    readOnlySnapshotOnly: true,
    runtimeSearchPerformed: true,
    decisionRule: "Discovery signals never select identity. Every Sense, Topic and Learning Set remains UNRESOLVED until an owner records an explicit reconciliation decision.",
    polysemyRule: "If an appVocabularyId is a candidate for multiple Master Senses, mark it ambiguous; in particular, bank and record senses must not share one runtime ID.",
    senses: candidateRows,
    topics: topicRows,
    learningSets: learningSetRows,
  };
}

export interface DevelopmentReconciliationFingerprintInput {
  target: { environment: string; provider: string; projectId: string; branchId: string; databaseName: string; roleName: string; purpose: string };
  releaseHash: string;
  snapshot: ReadOnlySnapshot;
  scan: JsonRecord;
  appliedMigrations: Array<{ tag: string; hash: string }>;
}

/** Hashes only stable, reconciliation-relevant state; timestamps and learner IDs are excluded. */
export function fingerprintDevelopmentReconciliationSnapshot(input: DevelopmentReconciliationFingerprintInput): string {
  const senses = Array.isArray(input.scan.senses) ? input.scan.senses as JsonRecord[] : [];
  const learningSets = Array.isArray(input.scan.learningSets) ? input.scan.learningSets as JsonRecord[] : [];
  const candidateVocabularyIds = new Set<number>();
  for (const sense of senses) {
    const candidates = Array.isArray(sense.runtimeCandidates) ? sense.runtimeCandidates as JsonRecord[] : [];
    for (const candidate of candidates) {
      if (typeof candidate.appVocabularyId === "number") candidateVocabularyIds.add(candidate.appVocabularyId);
    }
  }
  const candidateLearningSetIds = new Set<number>();
  for (const row of learningSets) {
    const candidates = Array.isArray(row.runtimeCandidates) ? row.runtimeCandidates as JsonRecord[] : [];
    for (const candidate of candidates) {
      if (typeof candidate.appLearningSetId === "number") candidateLearningSetIds.add(candidate.appLearningSetId);
    }
  }
  const senseIds = new Set(senses.map((row) => String(row.masterSenseId)));
  const learningSetIds = new Set(learningSets.map((row) => String(row.masterLearningSetId)));
  const mappingRows = input.snapshot.vocabularyMappings
    .filter((row) => senseIds.has(row.masterSenseId) || candidateVocabularyIds.has(row.vocabularyId))
    .sort((left, right) => left.masterSenseId.localeCompare(right.masterSenseId));
  const setMappingRows = input.snapshot.learningSetMappings
    .filter((row) => learningSetIds.has(row.masterLearningSetId) || candidateLearningSetIds.has(row.learningSetId))
    .sort((left, right) => left.masterLearningSetId.localeCompare(right.masterLearningSetId));
  const candidateSetItems = input.snapshot.learningSetItems
    .filter((row) => candidateLearningSetIds.has(row.learningSetId))
    .sort((left, right) => left.learningSetId - right.learningSetId || left.sortOrder - right.sortOrder || left.vocabularyId - right.vocabularyId);
  const candidateMasterSetMemberships = input.snapshot.masterLearningSetMemberships
    .filter((row) => candidateLearningSetIds.has(row.learningSetId))
    .sort((left, right) => left.learningSetId - right.learningSetId || left.sortOrder - right.sortOrder || left.masterLearningSetItemId.localeCompare(right.masterLearningSetItemId));
  const assignmentRows = [...(input.snapshot.learningSetAssignmentCounts ?? [])]
    .filter((row) => candidateLearningSetIds.has(row.learningSetId))
    .sort((left, right) => left.learningSetId - right.learningSetId);
  const progressRows = [...(input.snapshot.learnerProgressCounts ?? [])]
    .filter((row) => candidateVocabularyIds.has(row.vocabularyId))
    .sort((left, right) => left.vocabularyId - right.vocabularyId);
  const reviewRows = [...(input.snapshot.reviewEventCounts ?? [])]
    .filter((row) => candidateVocabularyIds.has(row.vocabularyId))
    .sort((left, right) => left.vocabularyId - right.vocabularyId);
  const discoveryUniverse = input.snapshot.vocabularies.map((row) => ({
    id: row.id,
    word: row.word,
    ipa: row.ipa,
    vietnamese: row.vietnamese,
    vietnameseOverride: row.vietnameseOverride,
    definitionEn: row.definitionEn,
    exampleEn: row.exampleEn,
    imageUrl: row.imageUrl,
    imageQuarantined: row.imageQuarantined,
    audioUrl: row.audioUrl,
    topic: row.topic,
    level: row.level,
    enabled: row.enabled,
    contentVersion: row.contentVersion,
    sourceDataset: row.sourceDataset ?? null,
    sourceRecordId: row.sourceRecordId ?? null,
  })).sort((left, right) => left.id - right.id);
  const setDiscoveryUniverse = [...input.snapshot.learningSets]
    .map((row) => ({ id: row.id, slug: row.slug, name: row.name, description: row.description, grade: row.grade, enabled: row.enabled, sortOrder: row.sortOrder }))
    .sort((left, right) => left.id - right.id);

  return canonicalJsonSha256({
    fingerprintVersion: "master-v2-development-reconciliation-snapshot-v1",
    target: input.target,
    releaseHash: input.releaseHash,
    appliedMigrations: [...input.appliedMigrations].sort((left, right) => left.tag.localeCompare(right.tag)),
    discoveryUniverse,
    candidateSearchResults: senses.map((row) => ({
      masterSenseId: row.masterSenseId,
      candidateIds: (Array.isArray(row.runtimeCandidates) ? row.runtimeCandidates as JsonRecord[] : [])
        .map((candidate) => candidate.appVocabularyId).sort((left, right) => Number(left) - Number(right)),
    })),
    vocabularyMappings: mappingRows,
    learnerProgressCounts: progressRows,
    reviewEventCounts: reviewRows,
    learningSetDiscoveryUniverse: setDiscoveryUniverse,
    learningSetSearchResults: learningSets.map((row) => ({
      masterLearningSetId: row.masterLearningSetId,
      candidateIds: (Array.isArray(row.runtimeCandidates) ? row.runtimeCandidates as JsonRecord[] : [])
        .map((candidate) => candidate.appLearningSetId).sort((left, right) => Number(left) - Number(right)),
    })),
    learningSetMappings: setMappingRows,
    learningSetItems: candidateSetItems,
    masterLearningSetMemberships: candidateMasterSetMemberships,
    learningSetAssignmentCounts: assignmentRows,
    appleIdentityAudit: input.snapshot.appleIdentityAudit ?? null,
    appliedRuns: [...input.snapshot.appliedRuns].sort((left, right) => left.datasetId.localeCompare(right.datasetId) || left.releaseHash.localeCompare(right.releaseHash)),
    topicProjection: "NOT_REQUIRED_FOR_THIS_CANARY",
  });
}
