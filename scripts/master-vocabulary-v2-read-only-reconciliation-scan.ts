import type { RuntimeSnapshot, RuntimeVocabulary } from "./master-vocabulary-v2-import-planner";

type JsonRecord = Record<string, unknown>;

export type ReadOnlyRuntimeVocabulary = RuntimeVocabulary & {
  sourceDataset?: string | null;
  sourceRecordId?: number | string | null;
};

export type ReadOnlySnapshot = Omit<RuntimeSnapshot, "vocabularies"> & {
  vocabularies: ReadOnlyRuntimeVocabulary[];
  learningSetAssignmentCounts?: Array<{ learningSetId: number; learnerAssignmentCount: number }>;
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

/**
 * Pure discovery over a snapshot supplied by a separately verified read-only adapter.
 * It never chooses a mapping decision and never mutates the supplied snapshot.
 */
export function scanMasterVocabularyV2ReadOnlySnapshot(input: ReadOnlyReconciliationScanInput): JsonRecord {
  const progressCount = new Map<number, number>();
  const reviewCount = new Map<number, number>();
  for (const row of input.snapshot.progressVocabularyIds) progressCount.set(row, (progressCount.get(row) ?? 0) + 1);
  for (const row of input.snapshot.reviewVocabularyIds) reviewCount.set(row, (reviewCount.get(row) ?? 0) + 1);

  const candidateRows: SenseScanResult[] = input.senses.map((master) => {
    const runtimeCandidates: JsonRecord[] = input.snapshot.vocabularies.flatMap((runtime) => {
      const matchingSignals = discoverySignals(master, runtime);
      if (matchingSignals.length === 0) return [];
      const differences = projectionDifferences(master.projection, runtime);
      return [{
        appVocabularyId: runtime.id,
        word: runtime.word,
        ipa: runtime.ipa,
        baseVietnamese: runtime.vietnamese,
        vietnameseOverride: runtime.vietnameseOverride,
        effectiveVietnamese: runtime.vietnameseOverride ?? runtime.vietnamese,
        definition: runtime.definitionEn,
        example: runtime.exampleEn,
        imageUrl: runtime.imageUrl,
        imageQuarantined: runtime.imageQuarantined,
        effectiveImageUrl: runtime.imageQuarantined ? null : runtime.imageUrl,
        audioUrl: runtime.audioUrl,
        legacyTopic: runtime.topic,
        level: runtime.level,
        enabled: runtime.enabled,
        contentVersion: runtime.contentVersion,
        sourceDataset: runtime.sourceDataset ?? null,
        sourceRecordId: runtime.sourceRecordId ?? null,
        learnerProgressReferenceCount: progressCount.get(runtime.id) ?? 0,
        reviewEventReferenceCount: reviewCount.get(runtime.id) ?? 0,
        matchingSignals,
        projectionEqualsMaster: differences.length === 0,
        firstAdoptionReview: differences.length === 0 ? "POSSIBLE_BASELINE_AFTER_OWNER_REVIEW" : "DRIFT_REVIEW_REQUIRED",
        projectionDifferences: differences,
        decision: "UNRESOLVED",
      }];
    });
    return {
      masterLexemeId: master.masterLexemeId,
      masterSenseId: master.masterSenseId,
      lemma: master.lemma,
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
      return { ...candidate, sameRuntimeIdCandidateForMasterSenses: [...new Set(owners)].sort(), polysemyAmbiguous: new Set(owners).size > 1 };
    });
  }

  const topicRows = (input.topics ?? []).map((master) => {
    const topicCandidates = input.snapshot.topics.filter((runtime) => sameText(runtime.slug, master.slug) || sameText(runtime.name, master.name))
      .map((runtime) => ({ appTopicId: runtime.id, slug: runtime.slug, name: runtime.name, enabled: runtime.enabled, slugCollision: sameText(runtime.slug, master.slug) }));
    return { ...master, decision: "UNRESOLVED", runtimeCandidates: topicCandidates };
  });
  const assignmentCounts = new Map((input.snapshot.learningSetAssignmentCounts ?? []).map((row) => [row.learningSetId, row.learnerAssignmentCount]));
  const learningSetRows = (input.learningSets ?? []).map((master) => {
    const runtimeCandidates = input.snapshot.learningSets.filter((runtime) => sameText(runtime.slug, master.slug) || sameText(runtime.name, master.name))
      .map((runtime) => ({
        appLearningSetId: runtime.id,
        slug: runtime.slug,
        name: runtime.name,
        enabled: runtime.enabled,
        learnerAssignmentCount: assignmentCounts.get(runtime.id) ?? null,
        memberships: input.snapshot.learningSetItems.filter((item) => item.learningSetId === runtime.id).map((item) => ({ vocabularyId: item.vocabularyId, sortOrder: item.sortOrder })),
        slugCollision: sameText(runtime.slug, master.slug),
      }));
    return { ...master, decision: "UNRESOLVED", runtimeCandidates };
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
