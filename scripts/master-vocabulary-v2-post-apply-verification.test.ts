import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMasterVocabularyImportPlan,
  emptySnapshot,
  type ImportArtifacts,
  type JsonRecord,
  type Reconciliation,
  type RuntimeSnapshot,
  type RuntimeVocabulary,
} from "./master-vocabulary-v2-import-planner";
import {
  classifyPostApplyScannerMismatch,
  verifyPostApplyState,
  type MigrationSummary,
  type PostApplyVerificationInput,
} from "./master-vocabulary-v2-post-apply-verification";

const RELEASE_HASH = "fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591";
const RECONCILIATION_HASH = "75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2";
const PLAN_FINGERPRINT = "4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b";
const IMPORT_RUN_ID = "de0b29c4-db84-4d76-abd4-398f17151099";
const IDS = new Map<string, number>([
  ["01a0fc13-09ed-70b4-801b-408be3b771e9", 1],
  ["01a0fc13-09ee-7211-8e5a-784c689a0c7a", 871],
  ["01a0fc13-09ee-7584-a480-e313e359f744", 2025],
  ["01a0fc13-09ee-71ff-9a0a-a96e48ef7dac", 2026],
  ["01a0fc13-09ee-7823-95fc-5d1d76f13fa5", 2027],
  ["01a0fc13-09ee-79c7-85ff-cbe0fc14a249", 2028],
  ["01a0fc13-09ef-710c-8e76-753a5cfea69c", 2029],
  ["01a0fc13-09ef-7d37-a50f-d05db6b1a89c", 284],
]);
const VERSIONS = new Map<number, number>([[1, 3], [871, 2], [284, 2], [2025, 1], [2026, 1], [2027, 1], [2028, 1], [2029, 1]]);

function json(relativePath: string): JsonRecord {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as JsonRecord;
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => typeof item === "object" && item !== null && !Array.isArray(item))
    : [];
}

function runtimeRow(id: number, projection: JsonRecord, contentVersion: number, overrides: Partial<RuntimeVocabulary> = {}): RuntimeVocabulary {
  return {
    id,
    word: String(projection.word),
    ipa: typeof projection.ipa === "string" ? projection.ipa : null,
    vietnamese: String(projection.vietnamese),
    vietnameseOverride: null,
    definitionEn: typeof projection.definitionEn === "string" ? projection.definitionEn : null,
    exampleEn: typeof projection.exampleEn === "string" ? projection.exampleEn : null,
    imageUrl: null,
    imageQuarantined: false,
    audioUrl: null,
    topic: null,
    level: null,
    enabled: projection.enabled === true,
    contentVersion,
    ...overrides,
  };
}

function verificationFixture(): PostApplyVerificationInput {
  const releaseRoot = "vocabflow-dataset/releases/canary-v2.1.0";
  const manifest = json(`${releaseRoot}/dataset.json`);
  const artifacts: ImportArtifacts = {
    vocabulary: json(`${releaseRoot}/import/vocabulary-import-v2.json`),
    topics: json(`${releaseRoot}/import/topics-import-v2.json`),
    learningSets: json(`${releaseRoot}/import/learning-sets-import-v2.json`),
    learningSetItems: json(`${releaseRoot}/import/learning-set-items-import-v2.json`),
    topicMemberships: json(`${releaseRoot}/import/topic-memberships-import-v2.json`),
  };
  const reconciliation = json("vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json") as unknown as Reconciliation;
  const snapshot: RuntimeSnapshot = emptySnapshot();
  const sourceRows = records(artifacts.vocabulary.records);
  snapshot.vocabularies = sourceRows.map((record) => {
    const id = IDS.get(String(record.masterSenseId));
    if (id === undefined || typeof record.runtimeProjection !== "object" || record.runtimeProjection === null || Array.isArray(record.runtimeProjection)) {
      throw new Error("Fixture release row does not match the expected canary.");
    }
    return runtimeRow(id, record.runtimeProjection as JsonRecord, VERSIONS.get(id) ?? 1);
  });
  snapshot.vocabularies.push(
    runtimeRow(295, { word: "apple", vietnamese: "quả táo", definitionEn: "A second apple entry.", exampleEn: "An older example.", enabled: true }, 1, { topic: "Food" }),
    runtimeRow(849, { word: "record", vietnamese: "đĩa nhạc", definitionEn: "A vinyl record kept in a collection.", exampleEn: "The record is old.", enabled: true }, 1),
  );
  snapshot.vocabularyMappings = sourceRows.map((record) => ({
    masterSenseId: String(record.masterSenseId),
    masterLexemeId: String(record.masterLexemeId),
    vocabularyId: IDS.get(String(record.masterSenseId))!,
    projectionContractVersion: String(artifacts.vocabulary.projectionContractVersion),
    appliedProjectionFingerprint: "0".repeat(64),
    lastReleaseHash: RELEASE_HASH,
  }));
  const learningSet = records(artifacts.learningSets.records)[0]!;
  const learningSetItem = records(artifacts.learningSetItems.records)[0]!;
  const algorithmId = IDS.get(String(learningSetItem.masterSenseId))!;
  snapshot.learningSets = [{
    id: 17,
    slug: String(learningSet.slug),
    name: String(learningSet.name),
    description: String(learningSet.description),
    grade: null,
    enabled: learningSet.enabled === true,
    sortOrder: Number(learningSet.sortOrder),
  }];
  snapshot.learningSetMappings = [{ masterLearningSetId: String(learningSet.masterLearningSetId), learningSetId: 17 }];
  snapshot.masterLearningSetMemberships = [{
    masterLearningSetItemId: String(learningSetItem.learningSetItemId),
    masterLearningSetId: String(learningSetItem.masterLearningSetId),
    masterSenseId: String(learningSetItem.masterSenseId),
    learningSetId: 17,
    vocabularyId: algorithmId,
    sortOrder: Number(learningSetItem.position),
  }];
  snapshot.learningSetItems = [
    { learningSetId: 17, vocabularyId: algorithmId, sortOrder: Number(learningSetItem.position) },
    { learningSetId: 3, vocabularyId: 295, sortOrder: 1 },
  ];
  snapshot.appliedRuns = [{
    datasetId: String(artifacts.vocabulary.sourceDatasetId),
    releaseHash: RELEASE_HASH,
    appImportContractVersion: String(artifacts.vocabulary.artifactVersion),
    projectionContractVersion: String(artifacts.vocabulary.projectionContractVersion),
    reconciliationHash: RECONCILIATION_HASH,
    planFingerprint: PLAN_FINGERPRINT,
  }];

  const buildPlan = () => buildMasterVocabularyImportPlan({
    artifacts,
    reconciliation,
    snapshot,
    targetEnvironment: "development",
    targetIdentity: reconciliation.target,
    mode: "DRY_RUN",
  });
  const initialPlan = buildPlan();
  for (const mapping of snapshot.vocabularyMappings) {
    mapping.appliedProjectionFingerprint = initialPlan.vocabulary.find((action) => action.masterSenseId === mapping.masterSenseId)?.fingerprint ?? "";
  }
  const plan = buildPlan();
  const migration: MigrationSummary = {
    current: true,
    appliedCount: 19,
    localMigrationCount: 19,
    latestTag: "0018_panoramic_spirit",
    hashMismatchCount: 0,
    missingJournalRows: 0,
    unexpectedAppliedRows: 0,
  };
  return {
    target: reconciliation.target,
    migration,
    manifest,
    artifacts,
    reconciliation,
    reconciliationHash: RECONCILIATION_HASH,
    snapshot,
    plan,
    ledgerRows: [{
      id: IMPORT_RUN_ID,
      planFingerprint: PLAN_FINGERPRINT,
      environment: "development",
      targetBranchId: "br-square-grass-b3af0nte",
    }],
  };
}

describe("Master V2 post-apply verifier", () => {
  it("accepts the frozen canary identities only when the effective runtime and plan are clean", () => {
    const result = verifyPostApplyState(verificationFixture());
    expect(result.passed).toBe(true);
    expect(result.checks).toMatchObject({
      development_target: true,
      migration_chain_current: true,
      approved_release_identity: true,
      eight_master_mappings: true,
      historical_mapping_ids: true,
      effective_projection_fingerprints: true,
      technology_starter_identity_and_item: true,
      single_matching_import_run: true,
      post_apply_plan_noop: true,
      no_history_or_assignment_actions: true,
    });
    expect(result.mappedIds).toEqual({ apple: 1, bankFinancial: 871, reservation: 284 });
    expect(result.createdIds).toEqual({ bankRiver: 2025, recordNoun: 2026, recordVerb: 2027, lookAfter: 2028, algorithm: 2029 });
  });

  it("rejects a runtime mapping whose stored fingerprint no longer matches its effective projection", () => {
    const fixture = verificationFixture();
    fixture.snapshot.vocabularyMappings[0]!.appliedProjectionFingerprint = "f".repeat(64);
    fixture.plan = buildMasterVocabularyImportPlan({
      artifacts: fixture.artifacts,
      reconciliation: fixture.reconciliation,
      snapshot: fixture.snapshot,
      targetEnvironment: "development",
      targetIdentity: fixture.target,
      mode: "DRY_RUN",
    });
    const result = verifyPostApplyState(fixture);
    expect(result.passed).toBe(false);
    expect(result.checks.effective_projection_fingerprints).toBe(false);
    expect(result.checks.post_apply_plan_noop).toBe(false);
  });

  it("classifies only a proven post-apply stale owner snapshot as expected", () => {
    expect(classifyPostApplyScannerMismatch("OWNER_PROPOSAL_CANDIDATE_SNAPSHOT_MISMATCH", true))
      .toBe("EXPECTED_PRE_APPLY_EVIDENCE_STALE_AFTER_SUCCESSFUL_APPLY");
    expect(classifyPostApplyScannerMismatch("OWNER_PROPOSAL_CANDIDATE_SNAPSHOT_MISMATCH", false)).toBe("UNEXPECTED");
    expect(classifyPostApplyScannerMismatch("DATABASE_IDENTITY_MISMATCH", true)).toBe("UNEXPECTED");
  });
});
