import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildMasterVocabularyImportPlan,
  apiEffectiveProjection,
  emptySnapshot,
  fingerprintEffectiveRuntimeProjection,
  type ImportArtifacts,
  type Reconciliation,
  type RuntimeSnapshot,
  type RuntimeVocabulary,
} from "./master-vocabulary-v2-import-planner";
import { applyMasterVocabularyImport, type MasterImportStore, type MasterImportTransaction } from "./master-vocabulary-v2-import-store";

const DATASET_ID = "0195f85c-7b2a-7d10-8c01-000000000001";
const LEXEME_ID = "0195f85c-7b2a-7d10-8c01-000000000002";
const SENSE_A = "0195f85c-7b2a-7d10-8c01-000000000003";
const SENSE_B = "0195f85c-7b2a-7d10-8c01-000000000004";
const TOPIC_ID = "0195f85c-7b2a-7d10-8c01-000000000005";
const SET_ID = "0195f85c-7b2a-7d10-8c01-000000000006";
const SET_ITEM_A = "0195f85c-7b2a-7d10-8c01-000000000007";
const RELEASE_HASH = "b".repeat(64);
const PROJECTION_A = {
  word: "bank", ipa: null, vietnamese: "ngân hàng", definitionEn: "A financial institution.", exampleEn: "She visited the bank.",
  imageUrl: null, audioUrl: null, topic: "Finance", level: null, enabled: true,
};
const PROJECTION_B = { ...PROJECTION_A, vietnamese: "bờ sông", definitionEn: "Land beside a river.", exampleEn: "They sat on the river bank.", topic: "Rivers" };

function record(masterSenseId: string, projection: Record<string, unknown> = PROJECTION_A, fingerprint = "a".repeat(64), projectionSemantics: Record<string, unknown> = {}) {
  return {
    masterLexemeId: LEXEME_ID, masterSenseId,
    sourceRevisions: { lexemeRevision: 1, senseRevision: 1 },
    projectionContractVersion: "runtime-vocabulary-projection-v2",
    masterProjectionFingerprint: fingerprint,
    projectionSemantics,
    runtimeProjection: projection,
  };
}
function metadata() {
  return {
    artifactVersion: "app-import-v3", sourceDataset: "VOCABFLOW_MASTER_V2", sourceDatasetId: DATASET_ID,
    sourceDatasetVersion: "2.0.0", sourceSchemaVersion: "2.0.1", sourceManifestStatus: "APPROVED",
    sourceManifestContentHash: "c".repeat(64), sourceReleaseHash: RELEASE_HASH, mode: "RELEASE", importEligible: true,
  };
}
function approvedArtifacts(options: { records?: ReturnType<typeof record>[]; withMemberships?: boolean } = {}): ImportArtifacts {
  const common = metadata();
  const vocabulary = { ...common, projectionContractVersion: "runtime-vocabulary-projection-v2", records: options.records ?? [record(SENSE_A)] };
  const topics = { ...common, records: [{ masterTopicId: TOPIC_ID, slug: "finance", name: "Finance", description: "Financial words.", sortOrder: 0 }] };
  const learningSets = { ...common, records: [{ masterLearningSetId: SET_ID, slug: "basic-finance", name: "Basic finance", description: "A finance set.", grade: null, enabled: true, sortOrder: 0 }] };
  return {
    vocabulary, topics, learningSets,
    learningSetItems: { ...common, records: options.withMemberships === false ? [] : [{ learningSetItemId: SET_ITEM_A, masterLearningSetId: SET_ID, masterSenseId: SENSE_A, position: 1 }] },
    topicMemberships: { ...common, records: options.withMemberships === false ? [] : [{ masterSenseId: SENSE_A, masterTopicId: TOPIC_ID }] },
  };
}
function reconciliation(artifacts: ImportArtifacts, options: {
  vocabulary?: Record<string, unknown>[]; topic?: Record<string, unknown>; set?: Record<string, unknown>;
  allowPartialImport?: boolean;
} = {}): Reconciliation {
  return {
    artifactVersion: "runtime-reconciliation-v3", owner: "human-reviewed", generatedByTransform: false,
    analysisOnly: false, acceptedByImporter: true,
    appImportContractVersion: String(artifacts.vocabulary.artifactVersion),
    projectionContractVersion: String(artifacts.vocabulary.projectionContractVersion),
    sourceDatasetId: String(artifacts.vocabulary.sourceDatasetId), sourceDatasetVersion: String(artifacts.vocabulary.sourceDatasetVersion),
    sourceSchemaVersion: String(artifacts.vocabulary.sourceSchemaVersion), sourceManifestContentHash: String(artifacts.vocabulary.sourceManifestContentHash),
    sourceReleaseHash: String(artifacts.vocabulary.sourceReleaseHash), allowPartialImport: options.allowPartialImport ?? false,
    snapshotFingerprint: "e".repeat(64), plannerSnapshotFingerprint: "f".repeat(64),
    target: { environment: "development", projectId: "fixture-project", branchId: "fixture-branch", databaseName: "fixture-db", purpose: "runtime", roleName: "vocabflow_runtime" },
    vocabulary: options.vocabulary ?? (artifacts.vocabulary.records as Array<{ masterSenseId: string }>).map((row) => ({ masterSenseId: row.masterSenseId, decision: "CREATE_NEW" })),
    topics: [options.topic ?? { masterTopicId: TOPIC_ID, decision: "CREATE_NEW" }],
    learningSets: [options.set ?? { masterLearningSetId: SET_ID, decision: "CREATE_NEW" }],
  };
}
function runtimeVocabulary(overrides: Partial<RuntimeVocabulary> = {}): RuntimeVocabulary {
  return {
    id: 123, ...PROJECTION_A, vietnameseOverride: null, imageQuarantined: false, contentVersion: 4, ...overrides,
  };
}
function mappedSnapshot(overrides: Partial<RuntimeSnapshot> = {}): RuntimeSnapshot {
  const snapshot = emptySnapshot();
  const runtime = runtimeVocabulary();
  const runtimeRows = overrides.vocabularies ?? [runtime];
  const mappedRuntime = runtimeRows.find((row) => row.id === 123) ?? runtime;
  return {
    ...snapshot,
    vocabularies: runtimeRows,
    vocabularyMappings: [{ masterSenseId: SENSE_A, masterLexemeId: LEXEME_ID, vocabularyId: 123, projectionContractVersion: "runtime-vocabulary-projection-v2", appliedProjectionFingerprint: fingerprintEffectiveRuntimeProjection(apiEffectiveProjection(mappedRuntime)), lastReleaseHash: RELEASE_HASH }],
    topics: [{ id: 9, slug: "finance", name: "Finance", description: "Financial words.", sortOrder: 0, enabled: true }],
    topicMappings: [{ masterTopicId: TOPIC_ID, topicId: 9 }],
    learningSets: [{ id: 11, slug: "basic-finance", name: "Basic finance", description: "A finance set.", grade: null, enabled: true, sortOrder: 0 }],
    learningSetMappings: [{ masterLearningSetId: SET_ID, learningSetId: 11 }],
    vocabularyTopics: [{ vocabularyId: 123, topicId: 9 }],
    masterVocabularyTopicMemberships: [{ masterSenseId: SENSE_A, masterTopicId: TOPIC_ID, vocabularyId: 123, topicId: 9 }],
    learningSetItems: [{ learningSetId: 11, vocabularyId: 123, sortOrder: 1 }],
    masterLearningSetMemberships: [{ masterLearningSetItemId: SET_ITEM_A, masterLearningSetId: SET_ID, masterSenseId: SENSE_A, learningSetId: 11, vocabularyId: 123, sortOrder: 1 }],
    ...overrides,
  };
}
function mappedReconciliation(artifacts: ImportArtifacts, vocabularyDecision: Record<string, unknown> = { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123 }) {
  return reconciliation(artifacts, {
    vocabulary: [vocabularyDecision],
    topic: { masterTopicId: TOPIC_ID, decision: "MAP_EXISTING", appTopicId: 9 },
    set: { masterLearningSetId: SET_ID, decision: "MAP_EXISTING", appLearningSetId: 11, membershipPolicy: "MANAGE_LISTED_MASTER_ITEMS" },
  });
}

describe("Master V2 runtime import planner", () => {
  it("blocks the checked-in DRAFT pilot and counts its unresolved identities without a database", () => {
    const root = "vocabflow-dataset/import";
    const actual: ImportArtifacts = {
      vocabulary: JSON.parse(readFileSync(`${root}/vocabulary-import-v2.json`, "utf8")) as ImportArtifacts["vocabulary"],
      topics: JSON.parse(readFileSync(`${root}/topics-import-v2.json`, "utf8")) as ImportArtifacts["topics"],
      learningSets: JSON.parse(readFileSync(`${root}/learning-sets-import-v2.json`, "utf8")) as ImportArtifacts["learningSets"],
      learningSetItems: JSON.parse(readFileSync(`${root}/learning-set-items-import-v2.json`, "utf8")) as ImportArtifacts["learningSetItems"],
      topicMemberships: JSON.parse(readFileSync(`${root}/topic-memberships-import-v2.json`, "utf8")) as ImportArtifacts["topicMemberships"],
    };
    const review = JSON.parse(readFileSync(`${root}/mappings/runtime-reconciliation-v2.json`, "utf8")) as Reconciliation;
    const plan = buildMasterVocabularyImportPlan({ artifacts: actual, reconciliation: review });
    expect(plan.eligibility).toMatchObject({ importEligible: false, reconciliationComplete: false, canApply: false });
    expect(plan.issues.map((issue) => issue.code)).toContain("IMPORT_ARTIFACT_NOT_ELIGIBLE");
    expect(plan.reconciliation.vocabularyUnresolved).toBeGreaterThan(0);
    expect(plan.reconciliation.topicsUnresolved).toBeGreaterThan(0);
    expect(plan.reconciliation.learningSetsUnresolved).toBeGreaterThan(0);
    expect(plan.issues.map((issue) => issue.code)).toContain("RECONCILIATION_SOURCE_MISMATCH");
    expect(plan.summary.vocabularyCreates).toBe(0);
    expect(plan.historySafety.deletionsPlanned).toBe(0);
  });

  it("accepts a synthetic approved release with explicit create decisions and never allocates ids in planning", () => {
    const artifacts = approvedArtifacts();
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: reconciliation(artifacts) });
    expect(plan.eligibility.canApply).toBe(true);
    expect(plan.vocabulary).toMatchObject([{ action: "CREATE", appVocabularyId: null, nextContentVersion: 1 }]);
    expect(plan.vocabulary[0]?.runtimeProjection).toMatchObject({ imageUrl: null, audioUrl: null });
    expect(plan.vocabulary[0]?.fieldOperations).toContainEqual(expect.objectContaining({ field: "imageUrl", action: "PRESERVE", before: null, masterRaw: null, after: null }));
    expect(plan.topics[0]).toMatchObject({ action: "CREATE", appId: null });
    expect(plan.learningSets[0]).toMatchObject({ action: "CREATE", appId: null });
    expect(plan.topicMemberships[0]).toMatchObject({ action: "INSERT", appVocabularyId: null, appContainerId: null });
    expect(plan.learningSetMemberships[0]).toMatchObject({ action: "INSERT", position: 1, appVocabularyId: null, appContainerId: null });
  });

  it("requires an importer-accepted, human-owned reconciliation and checks its pinned scan identity", () => {
    const artifacts = approvedArtifacts();
    const review = reconciliation(artifacts);
    const baseline = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review });
    expect(baseline.eligibility.canApply).toBe(true);
    review.plannerSnapshotFingerprint = baseline.snapshotFingerprint;

    const pinned = buildMasterVocabularyImportPlan({
      artifacts, reconciliation: review, snapshot: emptySnapshot(), targetEnvironment: "development",
      expectedSnapshotFingerprint: review.snapshotFingerprint,
      expectedPlannerSnapshotFingerprint: baseline.snapshotFingerprint,
      targetIdentity: review.target,
    });
    expect(pinned.eligibility.canApply).toBe(true);

    const changed = buildMasterVocabularyImportPlan({
      artifacts, reconciliation: review, snapshot: emptySnapshot(), targetEnvironment: "development",
      expectedSnapshotFingerprint: "a".repeat(64),
      expectedPlannerSnapshotFingerprint: "b".repeat(64),
      targetIdentity: { ...review.target, branchId: "changed-branch" },
    });
    expect(changed.eligibility.canApply).toBe(false);
    expect(changed.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "RECONCILIATION_SNAPSHOT_EVIDENCE_MISMATCH",
      "RECONCILIATION_PLANNER_SNAPSHOT_MISMATCH",
      "RECONCILIATION_TARGET_MISMATCH",
    ]));

    const analysisOnly = { ...review, analysisOnly: true, acceptedByImporter: false };
    const rejected = buildMasterVocabularyImportPlan({ artifacts, reconciliation: analysisOnly });
    expect(rejected.issues.map((issue) => issue.code)).toContain("RECONCILIATION_OWNERSHIP_INVALID");
  });

  it.each([
    ["DRAFT", "IMPORT_ARTIFACT_NOT_ELIGIBLE"],
    ["IN_REVIEW", "IMPORT_ARTIFACT_NOT_ELIGIBLE"],
  ])("blocks non-approved manifest status %s", (status, code) => {
    const artifacts = approvedArtifacts(); artifacts.vocabulary.sourceManifestStatus = status;
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: reconciliation(artifacts) });
    expect(plan.eligibility.canApply).toBe(false);
    expect(plan.issues.map((issue) => issue.code)).toContain(code);
  });

  it("blocks a release with importEligible false even when source is marked approved", () => {
    const artifacts = approvedArtifacts(); artifacts.vocabulary.importEligible = false;
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: reconciliation(artifacts) });
    expect(plan.issues.map((issue) => issue.code)).toContain("IMPORT_ARTIFACT_NOT_ELIGIBLE");
  });

  it("does not use lemma collisions to assign identity; distinct bank senses each need an explicit decision", () => {
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, PROJECTION_A), record(SENSE_B, PROJECTION_B)] });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: reconciliation(artifacts) });
    expect(plan.vocabulary.map((action) => action.action)).toEqual(["CREATE", "CREATE"]);
    expect(plan.vocabulary.map((action) => action.appVocabularyId)).toEqual([null, null]);
  });

  it("rejects duplicate app identity and a bridge mapping that would move", () => {
    const artifacts = approvedArtifacts({ records: [record(SENSE_A), record(SENSE_B, PROJECTION_B)] });
    const review = reconciliation(artifacts, { vocabulary: [
      { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123 },
      { masterSenseId: SENSE_B, decision: "MAP_EXISTING", appVocabularyId: 123 },
    ] });
    const duplicate = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: mappedSnapshot() });
    expect(duplicate.issues.map((issue) => issue.code)).toContain("APP_VOCABULARY_ID_REUSED_IN_RECONCILIATION");

    const moved = buildMasterVocabularyImportPlan({ artifacts: approvedArtifacts(), reconciliation: mappedReconciliation(approvedArtifacts(), { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 124 }), snapshot: mappedSnapshot() });
    expect(moved.issues.map((issue) => issue.code)).toContain("EXISTING_MAPPING_CANNOT_MOVE");
  });

  it("requires an explicit matching first-adoption baseline and does not bump contentVersion", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const review = mappedReconciliation(artifacts, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, firstAdoptionPolicy: "ADOPT_EXISTING_AS_BASELINE" });
    const snapshot = mappedSnapshot({ vocabularyMappings: [] });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot });
    expect(plan.vocabulary[0]).toMatchObject({ action: "NOOP", mappingAction: "CREATE_MAPPING", expectedContentVersion: 4, nextContentVersion: 4 });
    const mismatch = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: mappedSnapshot({ vocabularyMappings: [], vocabularies: [runtimeVocabulary({ vietnamese: "khác" })] }) });
    expect(mismatch.issues.map((issue) => issue.code)).toContain("BASELINE_PROJECTION_MISMATCH");
    const missingPolicy = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot: mappedSnapshot({ vocabularyMappings: [] }) });
    expect(missingPolicy.issues.map((issue) => issue.code)).toContain("FIRST_ADOPTION_POLICY_REQUIRED");
  });

  it("updates changed projections with exactly one derived contentVersion increment", () => {
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, { ...PROJECTION_A, vietnamese: "tổ chức tài chính" }, "d".repeat(64))], withMemberships: false });
    const runtime = runtimeVocabulary({ imageUrl: "https://legacy.example/image.webp", audioUrl: "https://legacy.example/audio.mp3" });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    expect(plan.vocabulary[0]).toMatchObject({ action: "UPDATE", expectedContentVersion: 4, nextContentVersion: 5 });
    expect(plan.vocabulary[0]?.runtimeProjection).toMatchObject({ imageUrl: runtime.imageUrl, audioUrl: runtime.audioUrl });
    expect(plan.summary.contentVersionIncrements).toBe(1);
  });

  it("preserves null Master enrichment fields and fingerprints the effective result", () => {
    const master = { ...PROJECTION_A, ipa: null, imageUrl: null, audioUrl: null, topic: null, level: null };
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, master)], withMemberships: false });
    const runtime = runtimeVocabulary({
      ipa: "/bæŋk/", imageUrl: "https://legacy.example/image.webp", audioUrl: "https://legacy.example/audio.mp3",
      topic: "Legacy Finance", level: "GRADE_3",
    });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    const action = plan.vocabulary[0]!;
    expect(action).toMatchObject({ action: "NOOP", expectedContentVersion: 4, nextContentVersion: 4 });
    expect(action.runtimeProjection).toMatchObject({ ipa: "/bæŋk/", imageUrl: runtime.imageUrl, audioUrl: runtime.audioUrl, topic: "Legacy Finance", level: "GRADE_3" });
    expect(action.effectiveProjection).toMatchObject({ imageUrl: runtime.imageUrl, audioUrl: runtime.audioUrl, ipa: "/bæŋk/", topic: "Legacy Finance", level: "GRADE_3" });
    expect(action.fieldOperations.filter((operation) => ["ipa", "imageUrl", "audioUrl", "topic", "level"].includes(operation.field))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "ipa", action: "PRESERVE", before: "/bæŋk/", masterRaw: null, after: "/bæŋk/" }),
        expect.objectContaining({ field: "imageUrl", action: "PRESERVE", before: runtime.imageUrl, masterRaw: null, after: runtime.imageUrl }),
        expect.objectContaining({ field: "audioUrl", action: "PRESERVE", before: runtime.audioUrl, masterRaw: null, after: runtime.audioUrl }),
        expect.objectContaining({ field: "topic", action: "PRESERVE", before: "Legacy Finance", masterRaw: null, after: "Legacy Finance" }),
        expect.objectContaining({ field: "level", action: "PRESERVE", before: "GRADE_3", masterRaw: null, after: "GRADE_3" }),
      ]),
    );
    expect(action.projectionOutcomes).toContain("PRESERVED_RUNTIME_ENRICHMENT");
    expect(action.fingerprint).toBe(fingerprintEffectiveRuntimeProjection(action.effectiveProjection!));
  });

  it("sets a concrete Master image over runtime media and increments once when the effective image changes", () => {
    const master = { ...PROJECTION_A, imageUrl: "https://master.example/image.webp" };
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, master)], withMemberships: false });
    const runtime = runtimeVocabulary({ imageUrl: "https://legacy.example/image.webp" });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    expect(plan.vocabulary[0]).toMatchObject({ action: "UPDATE", nextContentVersion: 5, runtimeProjection: { imageUrl: master.imageUrl } });
    expect(plan.vocabulary[0]?.fieldOperations).toContainEqual(expect.objectContaining({ field: "imageUrl", action: "SET", before: runtime.imageUrl, masterRaw: master.imageUrl, after: master.imageUrl }));
    expect(plan.vocabulary[0]?.projectionOutcomes).toContain("MASTER_FIELD_UPDATE");
  });

  it("clears an enrichment field only through explicit clearFields", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const runtime = runtimeVocabulary({ imageUrl: "https://legacy.example/image.webp" });
    const review = mappedReconciliation(artifacts, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, clearFields: ["imageUrl"] });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    expect(plan.vocabulary[0]).toMatchObject({ action: "UPDATE", nextContentVersion: 5, runtimeProjection: { imageUrl: null }, effectiveProjection: { imageUrl: null } });
    expect(plan.vocabulary[0]?.fieldOperations).toContainEqual(expect.objectContaining({ field: "imageUrl", action: "CLEAR", before: runtime.imageUrl, masterRaw: null, after: null }));
    expect(plan.vocabulary[0]?.projectionOutcomes).toContain("EXPLICIT_CLEAR");
  });

  it("blocks a silent null for existing Master-authoritative definition until explicitly cleared", () => {
    const master = { ...PROJECTION_A, definitionEn: null };
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, master)], withMemberships: false });
    const runtime = runtimeVocabulary();
    const blocked = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    expect(blocked.issues.map((issue) => issue.code)).toContain("MASTER_AUTHORITATIVE_NULL_REQUIRES_EXPLICIT_CLEAR");
    const review = mappedReconciliation(artifacts, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, clearFields: ["definitionEn"] });
    const cleared = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    expect(cleared.vocabulary[0]).toMatchObject({ action: "UPDATE", nextContentVersion: 5, runtimeProjection: { definitionEn: null } });
    expect(cleared.vocabulary[0]?.fieldOperations).toContainEqual(expect.objectContaining({ field: "definitionEn", action: "CLEAR" }));
  });

  it("preserves runtime Vietnamese override and image quarantine as separate controls", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const runtime = runtimeVocabulary({ vietnameseOverride: "ngân hàng", imageUrl: "https://legacy.example/image.webp", imageQuarantined: true });
    const review = mappedReconciliation(artifacts, {
      masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123,
      vietnameseOverridePolicy: "KEEP_IF_MATCHES_PROJECTION", imageQuarantinePolicy: "KEEP_IF_NO_IMAGE",
    });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: mappedSnapshot({ vocabularies: [runtime] }) });
    expect(plan.eligibility.canApply).toBe(true);
    expect(plan.vocabulary[0]).toMatchObject({ action: "NOOP", nextContentVersion: 4, effectiveProjection: { vietnamese: "ngân hàng", imageUrl: null } });
    expect(plan.vocabulary[0]?.controlOperations).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "vietnameseOverride", action: "PRESERVE", before: "ngân hàng", after: "ngân hàng" }),
      expect.objectContaining({ field: "imageQuarantined", action: "PRESERVE", before: true, after: true }),
    ]));
  });

  it("keeps the effective projection fingerprint stable when only Master provenance changes", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const samePlan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot: mappedSnapshot() });
    expect(samePlan.vocabulary[0]).toMatchObject({ action: "NOOP", expectedContentVersion: 4, nextContentVersion: 4 });
    const changed = approvedArtifacts({ records: [record(SENSE_A, PROJECTION_A, "e".repeat(64))], withMemberships: false });
    const changedPlan = buildMasterVocabularyImportPlan({ artifacts: changed, reconciliation: mappedReconciliation(changed), snapshot: mappedSnapshot() });
    expect(changedPlan.vocabulary[0]).toMatchObject({ action: "NOOP", expectedContentVersion: 4, nextContentVersion: 4 });
  });

  it("blocks mismatched Vietnamese overrides, preserves exact-match overrides only by explicit choice, and allows explicit clear", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const snapshot = mappedSnapshot({ vocabularies: [runtimeVocabulary({ vietnameseOverride: "ngân hàng cũ" })] });
    const base = mappedReconciliation(artifacts);
    const conflict = buildMasterVocabularyImportPlan({ artifacts, reconciliation: base, snapshot });
    expect(conflict.overrideConflicts.map((issue) => issue.code)).toContain("VIETNAMESE_OVERRIDE_CONFLICT");
    const exactSnapshot = mappedSnapshot({ vocabularies: [runtimeVocabulary({ vietnameseOverride: "ngân hàng" })] });
    const exactWithoutPolicy = buildMasterVocabularyImportPlan({ artifacts, reconciliation: base, snapshot: exactSnapshot });
    expect(exactWithoutPolicy.issues.map((issue) => issue.code)).toContain("VIETNAMESE_OVERRIDE_POLICY_REQUIRED");
    const exactWithPolicy = mappedReconciliation(artifacts, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, vietnameseOverridePolicy: "KEEP_IF_MATCHES_PROJECTION" });
    expect(buildMasterVocabularyImportPlan({ artifacts, reconciliation: exactWithPolicy, snapshot: exactSnapshot }).eligibility.canApply).toBe(true);
    const explicitClear = mappedReconciliation(artifacts, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, vietnameseOverridePolicy: "CLEAR" });
    expect(buildMasterVocabularyImportPlan({ artifacts, reconciliation: explicitClear, snapshot }).eligibility.canApply).toBe(true);
  });

  it("blocks quarantined projected images and requires an explicit policy when a quarantine masks no image", () => {
    const withImage = approvedArtifacts({ records: [record(SENSE_A, { ...PROJECTION_A, imageUrl: "https://cdn.example/image.webp" })], withMemberships: false });
    const snapshot = mappedSnapshot({ vocabularies: [runtimeVocabulary({ imageQuarantined: true })] });
    const blocked = buildMasterVocabularyImportPlan({ artifacts: withImage, reconciliation: mappedReconciliation(withImage), snapshot });
    expect(blocked.overrideConflicts.map((issue) => issue.code)).toContain("IMAGE_QUARANTINE_CONFLICT");
    const noImage = approvedArtifacts({ withMemberships: false });
    const noPolicy = buildMasterVocabularyImportPlan({ artifacts: noImage, reconciliation: mappedReconciliation(noImage), snapshot });
    expect(noPolicy.issues.map((issue) => issue.code)).toContain("IMAGE_QUARANTINE_POLICY_REQUIRED");
    const keepPolicy = mappedReconciliation(noImage, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, imageQuarantinePolicy: "KEEP_IF_NO_IMAGE" });
    expect(buildMasterVocabularyImportPlan({ artifacts: noImage, reconciliation: keepPolicy, snapshot }).eligibility.canApply).toBe(true);

    const quarantinedImage = mappedSnapshot({ vocabularies: [runtimeVocabulary({ imageUrl: "https://legacy.example/quarantined.webp", imageQuarantined: true })] });
    const revealOnly = mappedReconciliation(noImage, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, imageQuarantinePolicy: "CLEAR" });
    const revealBlocked = buildMasterVocabularyImportPlan({ artifacts: noImage, reconciliation: revealOnly, snapshot: quarantinedImage });
    expect(revealBlocked.issues.map((issue) => issue.code)).toContain("IMAGE_QUARANTINE_REVEAL_REQUIRES_EXPLICIT_IMAGE_CLEAR");
    const clearBoth = mappedReconciliation(noImage, {
      masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123,
      imageQuarantinePolicy: "CLEAR", clearFields: ["imageUrl"],
    });
    expect(buildMasterVocabularyImportPlan({ artifacts: noImage, reconciliation: clearBoth, snapshot: quarantinedImage }).vocabulary[0]).toMatchObject({
      action: "UPDATE", effectiveProjection: { imageUrl: null }, runtimeProjection: { imageUrl: null },
    });
  });

  it("requires an explicit contract-version rebase policy", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const snapshot = mappedSnapshot({ vocabularyMappings: [{ ...mappedSnapshot().vocabularyMappings[0]!, projectionContractVersion: "runtime-vocabulary-projection-v0" }] });
    const review = mappedReconciliation(artifacts);
    const blocked = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot });
    expect(blocked.issues.map((issue) => issue.code)).toContain("PROJECTION_CONTRACT_RECONCILIATION_REQUIRED");
    const rebase = mappedReconciliation(artifacts, { masterSenseId: SENSE_A, decision: "MAP_EXISTING", appVocabularyId: 123, projectionContractUpgradePolicy: "REBASE_IF_EFFECTIVE_MATCHES" });
    expect(buildMasterVocabularyImportPlan({ artifacts, reconciliation: rebase, snapshot }).eligibility.canApply).toBe(true);
  });

  it("blocks topic and set slug collisions, and requires explicit existing mappings", () => {
    const artifacts = approvedArtifacts();
    const review = reconciliation(artifacts);
    const collided = mappedSnapshot({ topicMappings: [], learningSetMappings: [], topics: [{ id: 45, slug: "finance", name: "Other", description: "", sortOrder: 0, enabled: true }], learningSets: [{ id: 46, slug: "basic-finance", name: "Other", description: "", grade: null, enabled: true, sortOrder: 0 }] });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: collided });
    expect(plan.issues.map((issue) => issue.code)).toContain("TOPIC_SLUG_COLLISION_REQUIRES_RECONCILIATION");
    expect(plan.issues.map((issue) => issue.code)).toContain("LEARNING_SET_SLUG_COLLISION_REQUIRES_RECONCILIATION");
  });

  it("manages only explicitly mapped memberships, preserves unrelated links and never changes learner assignments", () => {
    const artifacts = approvedArtifacts();
    const snapshot = mappedSnapshot({
      vocabularyTopics: [{ vocabularyId: 123, topicId: 9 }, { vocabularyId: 123, topicId: 77 }],
      learningSetItems: [{ learningSetId: 11, vocabularyId: 123, sortOrder: 4 }, { learningSetId: 11, vocabularyId: 999, sortOrder: 2 }],
      progressVocabularyIds: [123, 123], reviewVocabularyIds: [123, 123, 123],
    });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot });
    expect(plan.topicMemberships[0]?.action).toBe("NOOP");
    expect(plan.learningSetMemberships[0]?.action).toBe("UPDATE_ORDER");
    expect(plan.historySafety).toMatchObject({ learnerProgressRows: 2, reviewEvents: 3, mappedProgressReferences: 2, mappedReviewReferences: 3, deletionsPlanned: 0, learnerAssignmentsChanged: 0 });
    expect(plan.absentExistingMasterMappings).toEqual({ senses: 0, topics: 0, learningSets: 0 });
  });

  it("rejects an already-applied release if database state drift would require another mutation", () => {
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, { ...PROJECTION_A, vietnamese: "đã đổi" }, "f".repeat(64))], withMemberships: false });
    const review = mappedReconciliation(artifacts);
    const probe = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: mappedSnapshot() });
    const snapshot = mappedSnapshot({ appliedRuns: [{ datasetId: DATASET_ID, releaseHash: RELEASE_HASH, appImportContractVersion: "app-import-v3", projectionContractVersion: "runtime-vocabulary-projection-v2", reconciliationHash: probe.reconciliation.hash, planFingerprint: probe.planFingerprint }] });
    const replay = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot });
    expect(replay.issues.map((issue) => issue.code)).toContain("APPLIED_RELEASE_STATE_DRIFT_REQUIRES_REVIEW");
    expect(replay.eligibility.canApply).toBe(false);
  });

  it("refuses stale plan snapshots before any adapter mutation", async () => {
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, { ...PROJECTION_A, vietnamese: "thay đổi" }, "f".repeat(64))], withMemberships: false });
    const review = mappedReconciliation(artifacts);
    const initial = mappedSnapshot();
    const expected = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot: initial, targetEnvironment: "test" }).planFingerprint;
    const changed = mappedSnapshot({ vocabularies: [runtimeVocabulary({ contentVersion: 5 })] });
    const mutationCalls: string[] = [];
    const tx = new Proxy({ readSnapshotForUpdate: async () => changed }, {
      get(target, property) {
        if (property in target) return Reflect.get(target, property);
        return async () => { mutationCalls.push(String(property)); };
      },
    }) as unknown as MasterImportTransaction;
    const store: MasterImportStore = { readSnapshot: async () => changed, transaction: async (operation) => operation(tx) };
    await expect(applyMasterVocabularyImport({ store, artifacts, reconciliation: review, target: { environment: "test", branchId: "test-branch" }, expectedPlanFingerprint: expected, newRunId: "0195f85c-7b2a-7d10-8c01-000000000008" })).rejects.toThrow("MASTER_IMPORT_PLAN_STALE");
    expect(mutationCalls).toEqual([]);
  });

  it("allocates CREATE_NEW identity inside one transaction and makes an exact replay a no-op", async () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    artifacts.topics.records = [];
    artifacts.learningSets.records = [];
    artifacts.learningSetItems.records = [];
    artifacts.topicMemberships.records = [];
    const review = { ...reconciliation(artifacts), topics: [], learningSets: [] };
    let snapshot = emptySnapshot();
    const transactionCalls: string[] = [];
    const transactionAdapter: Pick<MasterImportTransaction,
      "readSnapshotForUpdate" | "insertImportRun" | "insertVocabulary" | "writeVocabularyMapping"> = {
      readSnapshotForUpdate: async () => snapshot,
      insertImportRun: async (input) => {
        transactionCalls.push("insertImportRun");
        snapshot = { ...snapshot, appliedRuns: [...snapshot.appliedRuns, {
          datasetId: input.datasetId, releaseHash: input.releaseHash,
          appImportContractVersion: input.appImportContractVersion,
          projectionContractVersion: input.projectionContractVersion,
          reconciliationHash: input.reconciliationHash, planFingerprint: input.planFingerprint,
        }] };
      },
      insertVocabulary: async (projection) => {
        transactionCalls.push("insertVocabulary");
        snapshot = { ...snapshot, vocabularies: [{
          id: 456, ...projection, vietnameseOverride: null, imageQuarantined: false, contentVersion: 1,
        }] };
        return 456;
      },
      writeVocabularyMapping: async (input) => {
        transactionCalls.push("writeVocabularyMapping");
        snapshot = { ...snapshot, vocabularyMappings: [{
          masterSenseId: input.masterSenseId, masterLexemeId: input.masterLexemeId,
          vocabularyId: input.vocabularyId, projectionContractVersion: input.projectionContractVersion,
          appliedProjectionFingerprint: input.appliedProjectionFingerprint, lastReleaseHash: input.lastReleaseHash,
        }] };
      },
    };
    const store: MasterImportStore = {
      readSnapshot: async () => snapshot,
      transaction: async (operation) => operation(new Proxy(transactionAdapter, {
        get(target, property) {
          if (property in target) return Reflect.get(target, property);
          return async () => { throw new Error(`UNEXPECTED_TRANSACTION_METHOD:${String(property)}`); };
        },
      }) as unknown as MasterImportTransaction),
    };

    const initialPlan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot, targetEnvironment: "test" });
    expect(initialPlan.vocabulary[0]).toMatchObject({ action: "CREATE", appVocabularyId: null, nextContentVersion: 1 });
    const first = await applyMasterVocabularyImport({
      store, artifacts, reconciliation: review,
      target: { environment: "test", branchId: "synthetic-branch" },
      expectedPlanFingerprint: initialPlan.planFingerprint,
      newRunId: "0195f85c-7b2a-7d10-8c01-000000000008",
    });
    expect(first).toMatchObject({ applied: true, idempotent: false });
    expect(transactionCalls).toEqual(["insertImportRun", "insertVocabulary", "writeVocabularyMapping"]);
    expect(snapshot.vocabularies).toMatchObject([{ id: 456, contentVersion: 1, word: "bank" }]);
    expect(snapshot.vocabularyMappings).toMatchObject([{ masterSenseId: SENSE_A, vocabularyId: 456, appliedProjectionFingerprint: initialPlan.vocabulary[0]!.fingerprint }]);

    const stableVocabulary = structuredClone(snapshot.vocabularies);
    const stableMappings = structuredClone(snapshot.vocabularyMappings);
    const replayPlan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot, targetEnvironment: "test" });
    expect(replayPlan.vocabulary[0]).toMatchObject({ action: "NOOP", mappingAction: "KEEP_MAPPING", appVocabularyId: 456, nextContentVersion: 1 });
    const replay = await applyMasterVocabularyImport({
      store, artifacts, reconciliation: review,
      target: { environment: "test", branchId: "synthetic-branch" },
      expectedPlanFingerprint: replayPlan.planFingerprint,
      newRunId: "0195f85c-7b2a-7d10-8c01-000000000009",
    });
    expect(replay).toMatchObject({ applied: false, idempotent: true });
    expect(transactionCalls).toEqual(["insertImportRun", "insertVocabulary", "writeVocabularyMapping"]);
    expect(snapshot.vocabularies).toEqual(stableVocabulary);
    expect(snapshot.vocabularyMappings).toEqual(stableMappings);
  });

  it("replays a mapped semantic update without clearing preserved enrichment", async () => {
    const artifacts = approvedArtifacts({ records: [record(SENSE_A, { ...PROJECTION_A, vietnamese: "ngân hàng mới" })], withMemberships: false });
    const review = mappedReconciliation(artifacts);
    let snapshot = mappedSnapshot({ vocabularies: [runtimeVocabulary({ imageUrl: "https://legacy.example/image.webp", audioUrl: "https://legacy.example/audio.mp3" })] });
    const calls: string[] = [];
    const transaction: Pick<MasterImportTransaction,
      "readSnapshotForUpdate" | "insertImportRun" | "updateVocabulary" | "writeVocabularyMapping" | "writeTopicMapping" | "writeLearningSetMapping"> = {
      readSnapshotForUpdate: async () => snapshot,
      insertImportRun: async (input) => {
        calls.push("insertImportRun");
        snapshot = { ...snapshot, appliedRuns: [...snapshot.appliedRuns, {
          datasetId: input.datasetId, releaseHash: input.releaseHash,
          appImportContractVersion: input.appImportContractVersion,
          projectionContractVersion: input.projectionContractVersion,
          reconciliationHash: input.reconciliationHash, planFingerprint: input.planFingerprint,
        }] };
      },
      updateVocabulary: async (input) => {
        calls.push("updateVocabulary");
        snapshot = { ...snapshot, vocabularies: snapshot.vocabularies.map((row) => row.id === input.vocabularyId
          ? { ...row, ...input.projection, contentVersion: input.nextContentVersion }
          : row) };
      },
      writeVocabularyMapping: async (input) => {
        calls.push("writeVocabularyMapping");
        snapshot = { ...snapshot, vocabularyMappings: snapshot.vocabularyMappings.map((row) => row.masterSenseId === input.masterSenseId
          ? { ...row, projectionContractVersion: input.projectionContractVersion, appliedProjectionFingerprint: input.appliedProjectionFingerprint, lastReleaseHash: input.lastReleaseHash }
          : row) };
      },
      writeTopicMapping: async () => { calls.push("writeTopicMapping"); },
      writeLearningSetMapping: async () => { calls.push("writeLearningSetMapping"); },
    };
    const store: MasterImportStore = {
      readSnapshot: async () => snapshot,
      transaction: async (operation) => operation(new Proxy(transaction, {
        get(target, property) {
          if (property in target) return Reflect.get(target, property);
          return async () => { throw new Error(`UNEXPECTED_REPLAY_TRANSACTION_METHOD:${String(property)}`); };
        },
      }) as unknown as MasterImportTransaction),
    };

    const initialPlan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot, targetEnvironment: "test" });
    expect(initialPlan.vocabulary[0]).toMatchObject({ action: "UPDATE", nextContentVersion: 5 });
    const first = await applyMasterVocabularyImport({
      store, artifacts, reconciliation: review, target: { environment: "test", branchId: "synthetic-branch" },
      expectedPlanFingerprint: initialPlan.planFingerprint, newRunId: "0195f85c-7b2a-7d10-8c01-000000000010",
    });
    expect(first).toMatchObject({ applied: true, idempotent: false });
    expect(snapshot.vocabularies[0]).toMatchObject({
      contentVersion: 5, vietnamese: "ngân hàng mới",
      imageUrl: "https://legacy.example/image.webp", audioUrl: "https://legacy.example/audio.mp3",
    });
    const callsAfterFirst = [...calls];
    const replayPlan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: review, snapshot, targetEnvironment: "test" });
    expect(replayPlan.vocabulary[0]).toMatchObject({ action: "NOOP", nextContentVersion: 5, runtimeProjection: { imageUrl: "https://legacy.example/image.webp", audioUrl: "https://legacy.example/audio.mp3" } });
    const replay = await applyMasterVocabularyImport({
      store, artifacts, reconciliation: review, target: { environment: "test", branchId: "synthetic-branch" },
      expectedPlanFingerprint: replayPlan.planFingerprint, newRunId: "0195f85c-7b2a-7d10-8c01-000000000011",
    });
    expect(replay).toMatchObject({ applied: false, idempotent: true });
    expect(calls).toEqual(callsAfterFirst);
    expect(snapshot.vocabularies[0]).toMatchObject({ contentVersion: 5, imageUrl: "https://legacy.example/image.webp", audioUrl: "https://legacy.example/audio.mp3" });
  });

  it("preserves the existing progress/review integer IDs in MAP_EXISTING planning", () => {
    const artifacts = approvedArtifacts({ withMemberships: false });
    const snapshot = mappedSnapshot({ progressVocabularyIds: [123], reviewVocabularyIds: [123] });
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: mappedReconciliation(artifacts), snapshot });
    expect(plan.vocabulary[0]?.appVocabularyId).toBe(123);
    expect(plan.historySafety.mappedProgressReferences).toBe(1);
    expect(plan.historySafety.mappedReviewReferences).toBe(1);
    expect(plan.historySafety.deletionsPlanned).toBe(0);
  });
});
