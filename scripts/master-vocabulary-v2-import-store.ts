import type postgres from "postgres";
import {
  buildMasterVocabularyImportPlan,
  type ImportArtifacts,
  type ImportPlan,
  type Reconciliation,
  type RuntimeSnapshot,
  type RuntimeVocabulary,
} from "./master-vocabulary-v2-import-planner";

type SqlClient = ReturnType<typeof postgres>;
type SqlTag = {
  <T extends readonly Record<string, unknown>[] = Record<string, unknown>[]>(parts: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  unsafe(query: string): Promise<Record<string, unknown>[]>;
  begin<T>(operation: (transaction: SqlTag) => Promise<T>): Promise<T>;
};
type VocabularyProjection = {
  word: string; ipa: string | null; vietnamese: string; definitionEn: string | null; exampleEn: string | null;
  imageUrl: string | null; audioUrl: string | null; topic: string | null; level: string | null; enabled: boolean;
};
type RuntimeTarget = { environment: "development" | "test" | "production"; branchId: string };
type ImportRunInput = {
  id: string; datasetId: string; datasetVersion: string; schemaVersion: string; appImportContractVersion: string;
  projectionContractVersion: string; releaseHash: string; reconciliationHash: string; planFingerprint: string;
  environment: string; targetBranchId: string;
};
type VocabularyMappingInput = {
  masterSenseId: string; masterLexemeId: string; vocabularyId: number; sourceDatasetId: string; sourceDatasetVersion: string;
  sourceSchemaVersion: string; projectionContractVersion: string; appliedProjectionFingerprint: string;
  appliedLexemeRevision: number; appliedSenseRevision: number; lastReleaseHash: string; lastImportRunId: string;
};
type SimpleMappingInput = { masterId: string; appId: number; sourceDatasetId: string; releaseHash: string; runId: string };

export interface MasterImportTransaction {
  readSnapshotForUpdate(): Promise<RuntimeSnapshot>;
  insertImportRun(input: ImportRunInput): Promise<void>;
  insertVocabulary(projection: VocabularyProjection): Promise<number>;
  updateVocabulary(input: { vocabularyId: number; expectedContentVersion: number; nextContentVersion: number; projection: VocabularyProjection; vietnameseOverridePolicy?: string; imageQuarantinePolicy?: string }): Promise<void>;
  writeVocabularyMapping(input: VocabularyMappingInput): Promise<void>;
  insertTopic(record: Record<string, unknown>): Promise<number>;
  updateTopic(topicId: number, record: Record<string, unknown>): Promise<void>;
  writeTopicMapping(input: SimpleMappingInput): Promise<void>;
  insertLearningSet(record: Record<string, unknown>): Promise<number>;
  updateLearningSet(learningSetId: number, record: Record<string, unknown>): Promise<void>;
  writeLearningSetMapping(input: SimpleMappingInput): Promise<void>;
  insertVocabularyTopic(vocabularyId: number, topicId: number): Promise<void>;
  writeVocabularyTopicMembership(input: { masterSenseId: string; masterTopicId: string; vocabularyId: number; topicId: number; releaseHash: string }): Promise<void>;
  upsertLearningSetItem(learningSetId: number, vocabularyId: number, sortOrder: number): Promise<void>;
  writeLearningSetMembership(input: { masterLearningSetItemId: string; masterLearningSetId: string; masterSenseId: string; learningSetId: number; vocabularyId: number; sortOrder: number; releaseHash: string }): Promise<void>;
}
export interface MasterImportStore {
  readSnapshot(): Promise<RuntimeSnapshot>;
  transaction<T>(operation: (transaction: MasterImportTransaction) => Promise<T>): Promise<T>;
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null && !Array.isArray(entry)) : [];
}
function requiredString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}
function requiredNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(code);
  return value;
}
function vocabularyProjection(value: unknown): VocabularyProjection {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("IMPORT_VOCABULARY_PROJECTION_INVALID");
  const row = value as Record<string, unknown>;
  return {
    word: requiredString(row.word, "IMPORT_VOCABULARY_PROJECTION_INVALID"),
    ipa: typeof row.ipa === "string" ? row.ipa : null,
    vietnamese: requiredString(row.vietnamese, "IMPORT_VOCABULARY_PROJECTION_INVALID"),
    definitionEn: typeof row.definitionEn === "string" ? row.definitionEn : null,
    exampleEn: typeof row.exampleEn === "string" ? row.exampleEn : null,
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    audioUrl: typeof row.audioUrl === "string" ? row.audioUrl : null,
    topic: typeof row.topic === "string" ? row.topic : null,
    level: typeof row.level === "string" ? row.level : null,
    enabled: row.enabled === true,
  };
}

/** Compare the reviewed dry-run with a row-locked snapshot and apply atomically. */
export async function applyMasterVocabularyImport(input: {
  store: MasterImportStore;
  artifacts: ImportArtifacts;
  reconciliation: Reconciliation;
  target: RuntimeTarget;
  expectedPlanFingerprint: string;
  newRunId: string;
}): Promise<{ applied: boolean; idempotent: boolean; plan: ImportPlan }> {
  const { store, artifacts, reconciliation, target } = input;
  return store.transaction(async (transaction) => {
    const snapshot = await transaction.readSnapshotForUpdate();
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation, snapshot, targetEnvironment: target.environment, mode: "APPLY" });
    if (!plan.eligibility.canApply) {
      throw new Error(plan.issues[0]?.code ?? "MASTER_IMPORT_APPLY_GATES_FAILED");
    }
    if (plan.planFingerprint !== input.expectedPlanFingerprint) throw new Error("MASTER_IMPORT_PLAN_STALE");
    const source = plan.source;
    const existingRun = snapshot.appliedRuns.some((run) => run.datasetId === source.datasetId
      && run.releaseHash === source.releaseHash
      && run.appImportContractVersion === source.appImportContractVersion
      && run.projectionContractVersion === source.projectionContractVersion
      && run.reconciliationHash === plan.reconciliation.hash);
    if (existingRun) return { applied: false, idempotent: true, plan };

    const datasetId = requiredString(source.datasetId, "IMPORT_DATASET_ID_REQUIRED");
    const releaseHash = requiredString(source.releaseHash, "IMPORT_RELEASE_HASH_REQUIRED");
    const projectionContractVersion = requiredString(source.projectionContractVersion, "IMPORT_PROJECTION_CONTRACT_REQUIRED");
    const runId = input.newRunId;
    await transaction.insertImportRun({
      id: runId, datasetId, datasetVersion: requiredString(source.datasetVersion, "IMPORT_DATASET_VERSION_REQUIRED"),
      schemaVersion: requiredString(source.schemaVersion, "IMPORT_SCHEMA_VERSION_REQUIRED"),
      appImportContractVersion: requiredString(source.appImportContractVersion, "IMPORT_APP_CONTRACT_REQUIRED"),
      projectionContractVersion, releaseHash, reconciliationHash: plan.reconciliation.hash,
      planFingerprint: plan.planFingerprint, environment: target.environment, targetBranchId: target.branchId,
    });

    const vocabularyRecords = new Map(recordArray(artifacts.vocabulary.records).map((record) => [String(record.masterSenseId), record]));
    const vocabularyIds = new Map<string, number>();
    for (const action of plan.vocabulary) {
      if (action.action === "SKIP") continue;
      const record = vocabularyRecords.get(action.masterSenseId);
      if (!record) throw new Error("IMPORT_VOCABULARY_RECORD_MISSING_AFTER_PLAN");
      const projection = vocabularyProjection(record.runtimeProjection);
      const lexemeId = requiredString(record.masterLexemeId, "IMPORT_LEXEME_ID_REQUIRED");
      const revisions = record.sourceRevisions as Record<string, unknown> | undefined;
      const mappingInput = (vocabularyId: number): VocabularyMappingInput => ({
        masterSenseId: action.masterSenseId, masterLexemeId: lexemeId, vocabularyId, sourceDatasetId: datasetId,
        sourceDatasetVersion: requiredString(source.datasetVersion, "IMPORT_DATASET_VERSION_REQUIRED"),
        sourceSchemaVersion: requiredString(source.schemaVersion, "IMPORT_SCHEMA_VERSION_REQUIRED"),
        projectionContractVersion, appliedProjectionFingerprint: requiredString(record.projectionFingerprint, "IMPORT_FINGERPRINT_REQUIRED"),
        appliedLexemeRevision: requiredNumber(revisions?.lexemeRevision, "IMPORT_LEXEME_REVISION_REQUIRED"),
        appliedSenseRevision: requiredNumber(revisions?.senseRevision, "IMPORT_SENSE_REVISION_REQUIRED"),
        lastReleaseHash: releaseHash, lastImportRunId: runId,
      });
      let vocabularyId = action.appVocabularyId;
      if (action.action === "CREATE") vocabularyId = await transaction.insertVocabulary(projection);
      else if (action.action === "UPDATE") {
        if (vocabularyId === null || action.expectedContentVersion === null || action.nextContentVersion === null) throw new Error("IMPORT_UPDATE_PLAN_INCOMPLETE");
        const reconciliationRow = reconciliation.vocabulary.find((entry) => entry.masterSenseId === action.masterSenseId);
        await transaction.updateVocabulary({
          vocabularyId, expectedContentVersion: action.expectedContentVersion,
          nextContentVersion: action.nextContentVersion, projection,
          vietnameseOverridePolicy: typeof reconciliationRow?.vietnameseOverridePolicy === "string" ? reconciliationRow.vietnameseOverridePolicy : undefined,
          imageQuarantinePolicy: typeof reconciliationRow?.imageQuarantinePolicy === "string" ? reconciliationRow.imageQuarantinePolicy : undefined,
        });
      }
      if (vocabularyId === null) throw new Error("IMPORT_VOCABULARY_ID_UNRESOLVED");
      vocabularyIds.set(action.masterSenseId, vocabularyId);
      await transaction.writeVocabularyMapping(mappingInput(vocabularyId));
    }

    const topicRecords = new Map(recordArray(artifacts.topics.records).map((record) => [String(record.masterTopicId), record]));
    const topicIds = new Map<string, number>();
    for (const action of plan.topics) {
      if (action.action === "SKIP") continue;
      const record = topicRecords.get(action.masterId);
      if (!record) throw new Error("IMPORT_TOPIC_RECORD_MISSING_AFTER_PLAN");
      const topicId = action.action === "CREATE" ? await transaction.insertTopic(record) : action.appId;
      if (topicId === null) throw new Error("IMPORT_TOPIC_ID_UNRESOLVED");
      if (action.action === "UPDATE") await transaction.updateTopic(topicId, record);
      topicIds.set(action.masterId, topicId);
      await transaction.writeTopicMapping({ masterId: action.masterId, appId: topicId, sourceDatasetId: datasetId, releaseHash, runId });
    }

    const setRecords = new Map(recordArray(artifacts.learningSets.records).map((record) => [String(record.masterLearningSetId), record]));
    const setIds = new Map<string, number>();
    for (const action of plan.learningSets) {
      if (action.action === "SKIP") continue;
      const record = setRecords.get(action.masterId);
      if (!record) throw new Error("IMPORT_LEARNING_SET_RECORD_MISSING_AFTER_PLAN");
      const learningSetId = action.action === "CREATE" ? await transaction.insertLearningSet(record) : action.appId;
      if (learningSetId === null) throw new Error("IMPORT_LEARNING_SET_ID_UNRESOLVED");
      if (action.action === "UPDATE") await transaction.updateLearningSet(learningSetId, record);
      setIds.set(action.masterId, learningSetId);
      await transaction.writeLearningSetMapping({ masterId: action.masterId, appId: learningSetId, sourceDatasetId: datasetId, releaseHash, runId });
    }

    for (const action of plan.topicMemberships) {
      if (action.action === "SKIP") continue;
      const vocabularyId = vocabularyIds.get(action.masterSenseId) ?? action.appVocabularyId;
      const topicId = topicIds.get(action.masterContainerId) ?? action.appContainerId;
      if (vocabularyId === null || topicId === null) throw new Error("IMPORT_TOPIC_MEMBERSHIP_ID_UNRESOLVED");
      if (action.action === "INSERT") await transaction.insertVocabularyTopic(vocabularyId, topicId);
      await transaction.writeVocabularyTopicMembership({ masterSenseId: action.masterSenseId, masterTopicId: action.masterContainerId, vocabularyId, topicId, releaseHash });
    }

    for (const action of plan.learningSetMemberships) {
      if (action.action === "SKIP") continue;
      const vocabularyId = vocabularyIds.get(action.masterSenseId) ?? action.appVocabularyId;
      const learningSetId = setIds.get(action.masterContainerId) ?? action.appContainerId;
      if (vocabularyId === null || learningSetId === null || !action.masterItemId || action.position === undefined) throw new Error("IMPORT_LEARNING_SET_MEMBERSHIP_ID_UNRESOLVED");
      if (action.action === "INSERT" || action.action === "UPDATE_ORDER") await transaction.upsertLearningSetItem(learningSetId, vocabularyId, action.position);
      await transaction.writeLearningSetMembership({
        masterLearningSetItemId: action.masterItemId, masterLearningSetId: action.masterContainerId,
        masterSenseId: action.masterSenseId, learningSetId, vocabularyId, sortOrder: action.position, releaseHash,
      });
    }
    return { applied: true, idempotent: false, plan };
  });
}

function mapVocabulary(row: Record<string, unknown>): RuntimeVocabulary {
  return {
    id: Number(row.id), word: String(row.word), ipa: row.ipa === null ? null : String(row.ipa), vietnamese: String(row.vietnamese),
    vietnameseOverride: row.vietnamese_override === null ? null : String(row.vietnamese_override),
    definitionEn: row.definition_en === null ? null : String(row.definition_en), exampleEn: row.example_en === null ? null : String(row.example_en),
    imageUrl: row.image_url === null ? null : String(row.image_url), imageQuarantined: row.image_quarantined === true,
    audioUrl: row.audio_url === null ? null : String(row.audio_url), topic: row.topic === null ? null : String(row.topic),
    level: row.level === null ? null : String(row.level), enabled: row.enabled === true, contentVersion: Number(row.content_version),
  };
}
function mapTopics(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({ id: Number(row.id), slug: String(row.slug), name: String(row.name), description: String(row.description), sortOrder: Number(row.sort_order), enabled: row.enabled === true }));
}
function mapLearningSets(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({ id: Number(row.id), slug: String(row.slug), name: String(row.name), description: String(row.description), grade: row.grade === null ? null : String(row.grade), enabled: row.enabled === true, sortOrder: Number(row.sort_order) }));
}

export function createPostgresMasterImportStore(sql: SqlClient): MasterImportStore {
  const sqlTag = sql as unknown as SqlTag;
  const readSnapshot = async (tx: SqlTag, lock: boolean): Promise<RuntimeSnapshot> => {
    const lockSuffix = lock ? " FOR UPDATE" : "";
    const rows = async (query: string) => tx.unsafe(query);
    const vocabRows = await rows(`SELECT id, word, ipa, vietnamese, vietnamese_override, definition_en, example_en, image_url, image_quarantined, audio_url, topic, level, enabled, content_version FROM "vocabflow_app"."vocabularies" ORDER BY id${lockSuffix}`);
    const vocabularyMappings = await rows(`SELECT master_sense_id, master_lexeme_id, vocabulary_id, projection_contract_version, applied_projection_fingerprint, last_release_hash FROM "vocabflow_app"."master_vocabulary_mappings" ORDER BY master_sense_id${lockSuffix}`);
    const topicRows = await rows(`SELECT id, slug, name, description, sort_order, enabled FROM "vocabflow_app"."topics" ORDER BY id${lockSuffix}`);
    const topicMappings = await rows(`SELECT master_topic_id, topic_id FROM "vocabflow_app"."master_topic_mappings" ORDER BY master_topic_id${lockSuffix}`);
    const setRows = await rows(`SELECT id, slug, name, description, grade, enabled, sort_order FROM "vocabflow_app"."learning_sets" ORDER BY id${lockSuffix}`);
    const setMappings = await rows(`SELECT master_learning_set_id, learning_set_id FROM "vocabflow_app"."master_learning_set_mappings" ORDER BY master_learning_set_id${lockSuffix}`);
    const topicLinks = await rows(`SELECT vocabulary_id, topic_id FROM "vocabflow_app"."vocabulary_topics" ORDER BY vocabulary_id, topic_id${lockSuffix}`);
    const ownedTopicLinks = await rows(`SELECT master_sense_id, master_topic_id, vocabulary_id, topic_id FROM "vocabflow_app"."master_vocabulary_topic_memberships" ORDER BY master_sense_id, master_topic_id${lockSuffix}`);
    const setLinks = await rows(`SELECT learning_set_id, vocabulary_id, sort_order FROM "vocabflow_app"."learning_set_items" ORDER BY learning_set_id, vocabulary_id${lockSuffix}`);
    const ownedSetLinks = await rows(`SELECT master_learning_set_item_id, master_learning_set_id, master_sense_id, learning_set_id, vocabulary_id, sort_order FROM "vocabflow_app"."master_learning_set_memberships" ORDER BY master_learning_set_id, master_sense_id${lockSuffix}`);
    const appliedRuns = await rows(`SELECT dataset_id, release_hash, app_import_contract_version, projection_contract_version, reconciliation_hash, plan_fingerprint FROM "vocabflow_app"."master_vocabulary_import_runs" ORDER BY applied_at`);
    const progress = await rows(`SELECT vocabulary_id FROM "vocabflow_app"."learner_progress" ORDER BY learner_id, vocabulary_id`);
    const reviews = await rows(`SELECT vocabulary_id FROM "vocabflow_app"."review_events" ORDER BY household_id, learner_id, review_id`);
    return {
      vocabularies: vocabRows.map(mapVocabulary),
      vocabularyMappings: vocabularyMappings.map((row) => ({ masterSenseId: String(row.master_sense_id), masterLexemeId: String(row.master_lexeme_id), vocabularyId: Number(row.vocabulary_id), projectionContractVersion: String(row.projection_contract_version), appliedProjectionFingerprint: String(row.applied_projection_fingerprint), lastReleaseHash: String(row.last_release_hash) })),
      topics: mapTopics(topicRows),
      topicMappings: topicMappings.map((row) => ({ masterTopicId: String(row.master_topic_id), topicId: Number(row.topic_id) })),
      learningSets: mapLearningSets(setRows),
      learningSetMappings: setMappings.map((row) => ({ masterLearningSetId: String(row.master_learning_set_id), learningSetId: Number(row.learning_set_id) })),
      vocabularyTopics: topicLinks.map((row) => ({ vocabularyId: Number(row.vocabulary_id), topicId: Number(row.topic_id) })),
      masterVocabularyTopicMemberships: ownedTopicLinks.map((row) => ({ masterSenseId: String(row.master_sense_id), masterTopicId: String(row.master_topic_id), vocabularyId: Number(row.vocabulary_id), topicId: Number(row.topic_id) })),
      learningSetItems: setLinks.map((row) => ({ learningSetId: Number(row.learning_set_id), vocabularyId: Number(row.vocabulary_id), sortOrder: Number(row.sort_order) })),
      masterLearningSetMemberships: ownedSetLinks.map((row) => ({ masterLearningSetItemId: String(row.master_learning_set_item_id), masterLearningSetId: String(row.master_learning_set_id), masterSenseId: String(row.master_sense_id), learningSetId: Number(row.learning_set_id), vocabularyId: Number(row.vocabulary_id), sortOrder: Number(row.sort_order) })),
      progressVocabularyIds: progress.map((row) => Number(row.vocabulary_id)),
      reviewVocabularyIds: reviews.map((row) => Number(row.vocabulary_id)),
      appliedRuns: appliedRuns.map((row) => ({ datasetId: String(row.dataset_id), releaseHash: String(row.release_hash), appImportContractVersion: String(row.app_import_contract_version), projectionContractVersion: String(row.projection_contract_version), reconciliationHash: String(row.reconciliation_hash), planFingerprint: String(row.plan_fingerprint) })),
    };
  };

  const transaction: MasterImportStore["transaction"] = async <T>(operation: (tx: MasterImportTransaction) => Promise<T>) => sqlTag.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(89421733)`;
    await tx`SELECT set_config('vocabflow.master_v2_import', 'on', true)`;
    const adapter: MasterImportTransaction = {
      readSnapshotForUpdate: () => readSnapshot(tx, true),
      insertImportRun: async (input) => {
        const inserted = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."master_vocabulary_import_runs"
          (id, dataset_id, dataset_version, schema_version, app_import_contract_version, projection_contract_version, release_hash, reconciliation_hash, plan_fingerprint, environment, target_branch_id)
          VALUES (${input.id}::uuid, ${input.datasetId}::uuid, ${input.datasetVersion}, ${input.schemaVersion}, ${input.appImportContractVersion}, ${input.projectionContractVersion}, ${input.releaseHash}, ${input.reconciliationHash}, ${input.planFingerprint}, ${input.environment}, ${input.targetBranchId})
          ON CONFLICT (environment, dataset_id, release_hash, app_import_contract_version, projection_contract_version, reconciliation_hash) DO NOTHING RETURNING id`;
        if (!inserted.length) throw new Error("IMPORT_RUN_ALREADY_APPLIED_REPLAN");
      },
      insertVocabulary: async (projection) => {
        const [row] = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."vocabularies"
          (word, ipa, vietnamese, vietnamese_override, definition_en, example_en, image_url, image_quarantined, audio_url, topic, level, enabled, content_version)
          VALUES (${projection.word}, ${projection.ipa}, ${projection.vietnamese}, NULL, ${projection.definitionEn}, ${projection.exampleEn}, ${projection.imageUrl}, false, ${projection.audioUrl}, ${projection.topic}, ${projection.level}::"vocabflow_app"."vocabulary_level", ${projection.enabled}, 1)
          RETURNING id`;
        if (!row) throw new Error("IMPORT_VOCABULARY_INSERT_FAILED");
        return Number(row.id);
      },
      updateVocabulary: async ({ vocabularyId, expectedContentVersion, nextContentVersion, projection, vietnameseOverridePolicy, imageQuarantinePolicy }) => {
        await tx`SELECT set_config('vocabflow.master_v2_import', 'on', true)`;
        const rows = await tx<Record<string, unknown>[]>`UPDATE "vocabflow_app"."vocabularies" SET
          word = ${projection.word}, ipa = ${projection.ipa}, vietnamese = ${projection.vietnamese},
          vietnamese_override = CASE WHEN ${vietnameseOverridePolicy === "CLEAR"} THEN NULL ELSE vietnamese_override END,
          definition_en = ${projection.definitionEn}, example_en = ${projection.exampleEn}, image_url = ${projection.imageUrl},
          image_quarantined = CASE WHEN ${imageQuarantinePolicy === "CLEAR"} THEN false ELSE image_quarantined END,
          audio_url = ${projection.audioUrl}, topic = ${projection.topic},
          level = ${projection.level}::"vocabflow_app"."vocabulary_level", enabled = ${projection.enabled},
          content_version = ${nextContentVersion}, updated_at = now()
          WHERE id = ${vocabularyId} AND content_version = ${expectedContentVersion} RETURNING id`;
        if (rows.length !== 1) throw new Error("MASTER_IMPORT_STALE_CONTENT_VERSION");
      },
      writeVocabularyMapping: async (input) => {
        const rows = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."master_vocabulary_mappings"
          (master_sense_id, master_lexeme_id, vocabulary_id, source_dataset_id, source_dataset_version, source_schema_version, projection_contract_version, applied_projection_fingerprint, applied_lexeme_revision, applied_sense_revision, last_release_hash, last_import_run_id)
          VALUES (${input.masterSenseId}::uuid, ${input.masterLexemeId}::uuid, ${input.vocabularyId}, ${input.sourceDatasetId}::uuid, ${input.sourceDatasetVersion}, ${input.sourceSchemaVersion}, ${input.projectionContractVersion}, ${input.appliedProjectionFingerprint}, ${input.appliedLexemeRevision}, ${input.appliedSenseRevision}, ${input.lastReleaseHash}, ${input.lastImportRunId}::uuid)
          ON CONFLICT (master_sense_id) DO UPDATE SET master_lexeme_id = EXCLUDED.master_lexeme_id, source_dataset_id = EXCLUDED.source_dataset_id,
          source_dataset_version = EXCLUDED.source_dataset_version, source_schema_version = EXCLUDED.source_schema_version,
          projection_contract_version = EXCLUDED.projection_contract_version, applied_projection_fingerprint = EXCLUDED.applied_projection_fingerprint,
          applied_lexeme_revision = EXCLUDED.applied_lexeme_revision, applied_sense_revision = EXCLUDED.applied_sense_revision,
          last_release_hash = EXCLUDED.last_release_hash, last_import_run_id = EXCLUDED.last_import_run_id, updated_at = now()
          WHERE "vocabflow_app"."master_vocabulary_mappings".vocabulary_id = EXCLUDED.vocabulary_id RETURNING vocabulary_id`;
        if (rows.length !== 1) throw new Error("MASTER_VOCABULARY_MAPPING_IDENTITY_CHANGED");
      },
      insertTopic: async (record) => {
        const [row] = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."topics" (slug, name, description, sort_order, enabled)
          VALUES (${String(record.slug)}, ${String(record.name)}, ${String(record.description)}, ${Number(record.sortOrder)}, true) RETURNING id`;
        if (!row) throw new Error("IMPORT_TOPIC_INSERT_FAILED"); return Number(row.id);
      },
      updateTopic: async (topicId, record) => { await tx`UPDATE "vocabflow_app"."topics" SET slug = ${String(record.slug)}, name = ${String(record.name)}, description = ${String(record.description)}, sort_order = ${Number(record.sortOrder)}, enabled = true, updated_at = now() WHERE id = ${topicId}`; },
      writeTopicMapping: async (input) => {
        const rows = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."master_topic_mappings" (master_topic_id, topic_id, source_dataset_id, last_release_hash, last_import_run_id)
          VALUES (${input.masterId}::uuid, ${input.appId}, ${input.sourceDatasetId}::uuid, ${input.releaseHash}, ${input.runId}::uuid)
          ON CONFLICT (master_topic_id) DO UPDATE SET source_dataset_id = EXCLUDED.source_dataset_id, last_release_hash = EXCLUDED.last_release_hash, last_import_run_id = EXCLUDED.last_import_run_id, updated_at = now()
          WHERE "vocabflow_app"."master_topic_mappings".topic_id = EXCLUDED.topic_id RETURNING topic_id`;
        if (rows.length !== 1) throw new Error("MASTER_TOPIC_MAPPING_IDENTITY_CHANGED");
      },
      insertLearningSet: async (record) => {
        const grade = typeof record.grade === "string" ? record.grade : null;
        const [row] = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."learning_sets" (slug, name, description, grade, enabled, sort_order)
          VALUES (${String(record.slug)}, ${String(record.name)}, ${String(record.description)}, ${grade}::"vocabflow_app"."vocabulary_level", ${record.enabled === true}, ${Number(record.sortOrder)}) RETURNING id`;
        if (!row) throw new Error("IMPORT_LEARNING_SET_INSERT_FAILED"); return Number(row.id);
      },
      updateLearningSet: async (learningSetId, record) => {
        const grade = typeof record.grade === "string" ? record.grade : null;
        await tx`UPDATE "vocabflow_app"."learning_sets" SET slug = ${String(record.slug)}, name = ${String(record.name)}, description = ${String(record.description)}, grade = ${grade}::"vocabflow_app"."vocabulary_level", enabled = ${record.enabled === true}, sort_order = ${Number(record.sortOrder)}, updated_at = now() WHERE id = ${learningSetId}`;
      },
      writeLearningSetMapping: async (input) => {
        const rows = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."master_learning_set_mappings" (master_learning_set_id, learning_set_id, source_dataset_id, last_release_hash, last_import_run_id)
          VALUES (${input.masterId}::uuid, ${input.appId}, ${input.sourceDatasetId}::uuid, ${input.releaseHash}, ${input.runId}::uuid)
          ON CONFLICT (master_learning_set_id) DO UPDATE SET source_dataset_id = EXCLUDED.source_dataset_id, last_release_hash = EXCLUDED.last_release_hash, last_import_run_id = EXCLUDED.last_import_run_id, updated_at = now()
          WHERE "vocabflow_app"."master_learning_set_mappings".learning_set_id = EXCLUDED.learning_set_id RETURNING learning_set_id`;
        if (rows.length !== 1) throw new Error("MASTER_LEARNING_SET_MAPPING_IDENTITY_CHANGED");
      },
      insertVocabularyTopic: async (vocabularyId, topicId) => { await tx`INSERT INTO "vocabflow_app"."vocabulary_topics" (vocabulary_id, topic_id) VALUES (${vocabularyId}, ${topicId}) ON CONFLICT (vocabulary_id, topic_id) DO NOTHING`; },
      writeVocabularyTopicMembership: async (input) => {
        const rows = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."master_vocabulary_topic_memberships" (master_sense_id, master_topic_id, vocabulary_id, topic_id, last_release_hash)
          VALUES (${input.masterSenseId}::uuid, ${input.masterTopicId}::uuid, ${input.vocabularyId}, ${input.topicId}, ${input.releaseHash})
          ON CONFLICT (master_sense_id, master_topic_id) DO UPDATE SET last_release_hash = EXCLUDED.last_release_hash
          WHERE "vocabflow_app"."master_vocabulary_topic_memberships".vocabulary_id = EXCLUDED.vocabulary_id AND "vocabflow_app"."master_vocabulary_topic_memberships".topic_id = EXCLUDED.topic_id RETURNING master_sense_id`;
        if (rows.length !== 1) throw new Error("MASTER_TOPIC_MEMBERSHIP_IDENTITY_CHANGED");
      },
      upsertLearningSetItem: async (learningSetId, vocabularyId, sortOrder) => {
        await tx`INSERT INTO "vocabflow_app"."learning_set_items" (learning_set_id, vocabulary_id, sort_order) VALUES (${learningSetId}, ${vocabularyId}, ${sortOrder})
          ON CONFLICT (learning_set_id, vocabulary_id) DO UPDATE SET sort_order = EXCLUDED.sort_order WHERE "vocabflow_app"."learning_set_items".sort_order <> EXCLUDED.sort_order`;
      },
      writeLearningSetMembership: async (input) => {
        const rows = await tx<Record<string, unknown>[]>`INSERT INTO "vocabflow_app"."master_learning_set_memberships" (master_learning_set_item_id, master_learning_set_id, master_sense_id, learning_set_id, vocabulary_id, sort_order, last_release_hash)
          VALUES (${input.masterLearningSetItemId}::uuid, ${input.masterLearningSetId}::uuid, ${input.masterSenseId}::uuid, ${input.learningSetId}, ${input.vocabularyId}, ${input.sortOrder}, ${input.releaseHash})
          ON CONFLICT (master_learning_set_item_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, last_release_hash = EXCLUDED.last_release_hash, updated_at = now()
          WHERE "vocabflow_app"."master_learning_set_memberships".master_learning_set_id = EXCLUDED.master_learning_set_id AND "vocabflow_app"."master_learning_set_memberships".master_sense_id = EXCLUDED.master_sense_id RETURNING master_learning_set_item_id`;
        if (rows.length !== 1) throw new Error("MASTER_LEARNING_SET_MEMBERSHIP_IDENTITY_CHANGED");
      },
    };
    return operation(adapter);
  }) as Promise<T>;
  return {
    readSnapshot: () => sqlTag.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      return readSnapshot(tx, false);
    }),
    transaction,
  };
}
