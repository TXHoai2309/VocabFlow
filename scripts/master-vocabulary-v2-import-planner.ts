import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";

export const MASTER_APP_IMPORT_VERSION = "app-import-v3";
export const MASTER_RUNTIME_PROJECTION_VERSION = "runtime-vocabulary-projection-v2";
export const RUNTIME_RECONCILIATION_VERSION = "runtime-reconciliation-v3";

export const VOCABULARY_FIELD_OWNERSHIP = {
  word: "MASTER_AUTHORITATIVE",
  ipa: "RUNTIME_ENRICHMENT",
  vietnamese: "MASTER_AUTHORITATIVE",
  vietnameseOverride: "RUNTIME_OVERRIDE",
  definitionEn: "MASTER_AUTHORITATIVE",
  exampleEn: "MASTER_AUTHORITATIVE",
  imageUrl: "RUNTIME_ENRICHMENT",
  imageQuarantined: "RUNTIME_OPERATIONAL",
  audioUrl: "RUNTIME_ENRICHMENT",
  topic: "RUNTIME_ENRICHMENT",
  level: "RUNTIME_ENRICHMENT",
  enabled: "MASTER_AUTHORITATIVE",
  contentVersion: "RUNTIME_OPERATIONAL",
  sourceDataset: "IDENTITY_METADATA",
  sourceRecordId: "IDENTITY_METADATA",
} as const;

export type VocabularyProjectionField = "word" | "ipa" | "vietnamese" | "definitionEn" | "exampleEn" | "imageUrl" | "audioUrl" | "topic" | "level" | "enabled";
export type VocabularyFieldOperation = {
  field: VocabularyProjectionField;
  ownership: typeof VOCABULARY_FIELD_OWNERSHIP[VocabularyProjectionField];
  action: "SET" | "PRESERVE" | "CLEAR" | "BLOCKED";
  before: unknown;
  masterRaw: unknown;
  after: unknown;
};

export type JsonRecord = Record<string, unknown>;
export type ImportArtifacts = {
  vocabulary: JsonRecord;
  topics: JsonRecord;
  learningSets: JsonRecord;
  learningSetItems: JsonRecord;
  topicMemberships: JsonRecord;
};
export type RuntimeSnapshot = {
  vocabularies: RuntimeVocabulary[];
  vocabularyMappings: RuntimeVocabularyMapping[];
  topics: RuntimeTopic[];
  topicMappings: RuntimeTopicMapping[];
  learningSets: RuntimeLearningSet[];
  learningSetMappings: RuntimeLearningSetMapping[];
  vocabularyTopics: Array<{ vocabularyId: number; topicId: number }>;
  masterVocabularyTopicMemberships: Array<{ masterSenseId: string; masterTopicId: string; vocabularyId: number; topicId: number }>;
  learningSetItems: Array<{ learningSetId: number; vocabularyId: number; sortOrder: number }>;
  masterLearningSetMemberships: Array<{ masterLearningSetItemId: string; masterLearningSetId: string; masterSenseId: string; learningSetId: number; vocabularyId: number; sortOrder: number }>;
  progressVocabularyIds: number[];
  reviewVocabularyIds: number[];
  appliedRuns: Array<{ datasetId: string; releaseHash: string; appImportContractVersion: string; projectionContractVersion: string; reconciliationHash: string; planFingerprint: string }>;
};

export type RuntimeVocabulary = {
  id: number;
  word: string;
  ipa: string | null;
  vietnamese: string;
  vietnameseOverride: string | null;
  definitionEn: string | null;
  exampleEn: string | null;
  imageUrl: string | null;
  imageQuarantined: boolean;
  audioUrl: string | null;
  topic: string | null;
  level: string | null;
  enabled: boolean;
  contentVersion: number;
  sourceDataset?: string | null;
  sourceRecordId?: number | null;
};
export type RuntimeVocabularyMapping = {
  masterSenseId: string;
  masterLexemeId: string;
  vocabularyId: number;
  projectionContractVersion: string;
  appliedProjectionFingerprint: string;
  lastReleaseHash: string;
};
export type RuntimeTopic = { id: number; slug: string; name: string; description: string; sortOrder: number; enabled: boolean };
export type RuntimeTopicMapping = { masterTopicId: string; topicId: number };
export type RuntimeLearningSet = { id: number; slug: string; name: string; description: string; grade: string | null; enabled: boolean; sortOrder: number };
export type RuntimeLearningSetMapping = { masterLearningSetId: string; learningSetId: number };

export type Reconciliation = {
  artifactVersion: string;
  owner: string;
  generatedByTransform: boolean;
  analysisOnly: boolean;
  acceptedByImporter: boolean;
  appImportContractVersion: string;
  projectionContractVersion: string;
  sourceDatasetId: string;
  sourceDatasetVersion: string;
  sourceSchemaVersion: string;
  sourceManifestContentHash: string;
  sourceReleaseHash: string | null;
  snapshotFingerprint: string;
  plannerSnapshotFingerprint: string;
  target: JsonRecord;
  allowPartialImport: boolean;
  vocabulary: JsonRecord[];
  topics: JsonRecord[];
  learningSets: JsonRecord[];
};

export type PlanIssue = { code: string; entityType?: string; entityId?: string; message: string };
export type VocabularyAction = {
  masterSenseId: string;
  action: "CREATE" | "UPDATE" | "NOOP" | "SKIP" | "CONFLICT" | "BLOCKED";
  mappingAction: "CREATE_MAPPING" | "KEEP_MAPPING" | "NONE" | "CONFLICT";
  appVocabularyId: number | null;
  expectedContentVersion: number | null;
  nextContentVersion: number | null;
  masterProjectionFingerprint: string | null;
  fingerprint: string | null;
  runtimeProjection: JsonRecord | null;
  effectiveProjection: JsonRecord | null;
  fieldOperations: VocabularyFieldOperation[];
  controlOperations: Array<{ field: "vietnameseOverride" | "imageQuarantined"; action: "PRESERVE" | "CLEAR"; before: unknown; masterRaw: "NOT_PROJECTED"; after: unknown }>;
  projectionOutcomes: Array<"PRESERVED_RUNTIME_ENRICHMENT" | "MASTER_FIELD_UPDATE" | "EXPLICIT_CLEAR">;
  issues: PlanIssue[];
};
export type EntityAction = {
  masterId: string;
  action: "CREATE" | "UPDATE" | "MAP_EXISTING" | "NOOP" | "SKIP" | "CONFLICT" | "BLOCKED";
  appId: number | null;
  issues: PlanIssue[];
};
export type MembershipAction = {
  masterSenseId: string;
  masterContainerId: string;
  masterItemId?: string;
  appVocabularyId: number | null;
  appContainerId: number | null;
  position?: number;
  action: "INSERT" | "UPDATE_ORDER" | "ADOPT_EXISTING" | "NOOP" | "SKIP" | "BLOCKED" | "CONFLICT";
  issues: PlanIssue[];
};

export type ImportPlan = {
  planVersion: "master-runtime-import-plan-v2";
  mode: "DRY_RUN" | "APPLY";
  targetEnvironment: string;
  source: {
    datasetId: string | null;
    datasetVersion: string | null;
    schemaVersion: string | null;
    manifestStatus: string | null;
    releaseHash: string | null;
    appImportContractVersion: string | null;
    projectionContractVersion: string | null;
  };
  eligibility: { importEligible: boolean; reconciliationComplete: boolean; canApply: boolean };
  reconciliation: { hash: string; vocabularyResolved: number; vocabularyUnresolved: number; topicsResolved: number; topicsUnresolved: number; learningSetsResolved: number; learningSetsUnresolved: number };
  vocabulary: VocabularyAction[];
  topics: EntityAction[];
  learningSets: EntityAction[];
  topicMemberships: MembershipAction[];
  learningSetMemberships: MembershipAction[];
  absentExistingMasterMappings: { senses: number; topics: number; learningSets: number };
  overrideConflicts: PlanIssue[];
  issues: PlanIssue[];
  summary: Record<string, number>;
  historySafety: { learnerProgressRows: number; reviewEvents: number; mappedProgressReferences: number; mappedReviewReferences: number; deletionsPlanned: 0; learnerAssignmentsChanged: 0 };
  snapshotFingerprint: string;
  planFingerprint: string;
};

const emptySnapshot = (): RuntimeSnapshot => ({
  vocabularies: [], vocabularyMappings: [], topics: [], topicMappings: [], learningSets: [], learningSetMappings: [],
  vocabularyTopics: [], masterVocabularyTopicMemberships: [], learningSetItems: [], masterLearningSetMemberships: [],
  progressVocabularyIds: [], reviewVocabularyIds: [], appliedRuns: [],
});

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function str(value: unknown): string | null { return typeof value === "string" ? value : null; }
function num(value: unknown): number | null { return typeof value === "number" && Number.isInteger(value) ? value : null; }
function addIssue(issues: PlanIssue[], code: string, entityType?: string, entityId?: string) {
  issues.push({ code, ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}), message: code });
}
function same(a: unknown, b: unknown): boolean { return canonicalJsonSha256(a) === canonicalJsonSha256(b); }
function actionCount<T extends { action: string }>(actions: T[], action: string) { return actions.filter((entry) => entry.action === action).length; }

function metadataMatches(artifacts: ImportArtifacts, reconciliation: Reconciliation, issues: PlanIssue[]) {
  const metadataKeys = ["sourceDatasetId", "sourceDatasetVersion", "sourceSchemaVersion", "sourceManifestContentHash", "sourceReleaseHash"] as const;
  for (const key of metadataKeys) {
    const expected = artifacts.vocabulary[key] ?? null;
    if ((reconciliation as unknown as JsonRecord)[key] !== expected) addIssue(issues, "RECONCILIATION_SOURCE_MISMATCH", "RECONCILIATION", key);
    for (const artifact of [artifacts.topics, artifacts.learningSets, artifacts.learningSetItems, artifacts.topicMemberships]) {
      if ((artifact[key] ?? null) !== expected) addIssue(issues, "APP_IMPORT_ARTIFACT_METADATA_MISMATCH", "ARTIFACT", key);
    }
  }
  if (reconciliation.artifactVersion !== RUNTIME_RECONCILIATION_VERSION
      || reconciliation.owner !== "human-reviewed"
      || reconciliation.generatedByTransform !== false
      || reconciliation.analysisOnly !== false
      || reconciliation.acceptedByImporter !== true) {
    addIssue(issues, "RECONCILIATION_OWNERSHIP_INVALID", "RECONCILIATION");
  }
  if (reconciliation.appImportContractVersion !== artifacts.vocabulary.artifactVersion) {
    addIssue(issues, "RECONCILIATION_APP_IMPORT_CONTRACT_MISMATCH", "RECONCILIATION");
  }
  if (reconciliation.projectionContractVersion !== artifacts.vocabulary.projectionContractVersion) {
    addIssue(issues, "RECONCILIATION_PROJECTION_CONTRACT_MISMATCH", "RECONCILIATION");
  }
  if (!hasValidDigest(reconciliation.snapshotFingerprint) || !hasValidDigest(reconciliation.plannerSnapshotFingerprint)) {
    addIssue(issues, "RECONCILIATION_SNAPSHOT_IDENTITY_INVALID", "RECONCILIATION");
  }
  if (!isRecord(reconciliation.target)
      || typeof reconciliation.target.environment !== "string"
      || typeof reconciliation.target.projectId !== "string"
      || typeof reconciliation.target.branchId !== "string"
      || typeof reconciliation.target.databaseName !== "string"
      || typeof reconciliation.target.purpose !== "string"
      || typeof reconciliation.target.roleName !== "string") {
    addIssue(issues, "RECONCILIATION_TARGET_IDENTITY_INVALID", "RECONCILIATION");
  }
}

function decisionIndex(entries: JsonRecord[], key: string, issues: PlanIssue[], entityType: string) {
  const index = new Map<string, JsonRecord>();
  for (const entry of entries) {
    const id = str(entry[key]);
    if (!id || index.has(id)) addIssue(issues, "RECONCILIATION_ID_MISSING_OR_DUPLICATE", entityType, id ?? undefined);
    else index.set(id, entry);
  }
  return index;
}

function projectionOfRecord(record: JsonRecord): JsonRecord | null {
  return isRecord(record.runtimeProjection) ? record.runtimeProjection : null;
}
function apiEffectiveProjection(row: RuntimeVocabulary): JsonRecord {
  return {
    word: row.word, ipa: row.ipa, vietnamese: row.vietnameseOverride ?? row.vietnamese,
    definitionEn: row.definitionEn, exampleEn: row.exampleEn,
    imageUrl: row.imageQuarantined ? null : row.imageUrl, audioUrl: row.audioUrl,
    topic: row.topic, level: row.level, enabled: row.enabled,
  };
}
const projectionFields: VocabularyProjectionField[] = [
  "word", "ipa", "vietnamese", "definitionEn", "exampleEn", "imageUrl", "audioUrl", "topic", "level", "enabled",
];
const clearableProjectionFields = new Set<VocabularyProjectionField>([
  "ipa", "definitionEn", "exampleEn", "imageUrl", "audioUrl", "topic", "level",
]);
function runtimeProjectionValue(row: RuntimeVocabulary, field: VocabularyProjectionField): unknown {
  return row[field];
}
function effectiveProjectionFromValues(projection: JsonRecord, vietnameseOverride: string | null, imageQuarantined: boolean): JsonRecord {
  return {
    word: projection.word, ipa: projection.ipa, vietnamese: vietnameseOverride ?? projection.vietnamese,
    definitionEn: projection.definitionEn, exampleEn: projection.exampleEn,
    imageUrl: imageQuarantined ? null : projection.imageUrl, audioUrl: projection.audioUrl,
    topic: projection.topic, level: projection.level, enabled: projection.enabled,
  };
}
function normalizeLearnerText(value: unknown): string | null {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").normalize("NFC") : null;
}
function semanticMediaIdentity(value: unknown, operation: VocabularyFieldOperation["action"] | undefined): unknown {
  if (operation === "CLEAR" || value === null || value === undefined) return null;
  if (isRecord(value)) return value;
  return { runtimeUrl: value };
}
export function fingerprintEffectiveRuntimeProjection(
  projection: JsonRecord,
  semantics: JsonRecord = {},
  operations: VocabularyFieldOperation[] = [],
): string {
  const operationByField = new Map(operations.map((operation) => [operation.field, operation.action]));
  const envelope = {
    projectionContractVersion: MASTER_RUNTIME_PROJECTION_VERSION,
    word: normalizeLearnerText(projection.word),
    wordLanguage: str(semantics.wordLanguage) ?? "en",
    ipa: normalizeLearnerText(projection.ipa),
    pronunciationLocale: str(semantics.pronunciationLocale) ?? "en-US",
    vietnamese: normalizeLearnerText(projection.vietnamese),
    translationLanguage: str(semantics.translationLanguage) ?? "vi",
    definitionEn: normalizeLearnerText(projection.definitionEn),
    definitionLanguage: projection.definitionEn === null ? null : str(semantics.definitionLanguage) ?? "en",
    exampleEn: normalizeLearnerText(projection.exampleEn),
    exampleLanguage: projection.exampleEn === null ? null : str(semantics.exampleLanguage) ?? "en",
    topic: normalizeLearnerText(projection.topic),
    level: projection.level,
    image: semanticMediaIdentity(
      operationByField.get("imageUrl") === "SET" && semantics.image !== null && semantics.image !== undefined ? semantics.image : projection.imageUrl,
      operationByField.get("imageUrl"),
    ),
    audio: semanticMediaIdentity(
      operationByField.get("audioUrl") === "SET" && semantics.audio !== null && semantics.audio !== undefined ? semantics.audio : projection.audioUrl,
      operationByField.get("audioUrl"),
    ),
    enabled: projection.enabled,
  };
  return canonicalJsonSha256(envelope);
}
function emptyVocabularyAction(masterSenseId: string, action: VocabularyAction["action"], appVocabularyId: number | null, issues: PlanIssue[], masterFingerprint: string | null = null): VocabularyAction {
  return {
    masterSenseId, action, mappingAction: action === "CONFLICT" ? "CONFLICT" : "NONE", appVocabularyId,
    expectedContentVersion: null, nextContentVersion: null, masterProjectionFingerprint: masterFingerprint,
    fingerprint: null, runtimeProjection: null, effectiveProjection: null, fieldOperations: [], controlOperations: [],
    projectionOutcomes: [], issues,
  };
}
function hasValidDigest(value: unknown) { return typeof value === "string" && /^[0-9a-f]{64}$/.test(value); }

function planVocabulary(artifacts: ImportArtifacts, reconciliation: Reconciliation, snapshot: RuntimeSnapshot, issues: PlanIssue[], overrideConflicts: PlanIssue[]) {
  const rows = records(artifacts.vocabulary.records);
  const decisions = decisionIndex(reconciliation.vocabulary, "masterSenseId", issues, "VOCABULARY");
  const runtimeById = new Map(snapshot.vocabularies.map((row) => [row.id, row]));
  const mappingBySense = new Map(snapshot.vocabularyMappings.map((row) => [row.masterSenseId, row]));
  const mappingByAppId = new Map(snapshot.vocabularyMappings.map((row) => [row.vocabularyId, row]));
  const seenAppIds = new Map<number, string>();
  const plan: VocabularyAction[] = [];

  for (const record of rows) {
    const masterSenseId = str(record.masterSenseId) ?? "";
    const masterProjection = projectionOfRecord(record);
    const masterFingerprint = str(record.masterProjectionFingerprint);
    const decision = decisions.get(masterSenseId);
    const localIssues: PlanIssue[] = [];
    const fail = (code: string) => {
      addIssue(localIssues, code, "SENSE", masterSenseId || undefined);
      addIssue(issues, code, "SENSE", masterSenseId || undefined);
    };
    if (!masterSenseId || !masterProjection || !hasValidDigest(masterFingerprint)
        || record.projectionContractVersion !== MASTER_RUNTIME_PROJECTION_VERSION) {
      fail("IMPORT_VOCABULARY_RECORD_INVALID");
      plan.push(emptyVocabularyAction(masterSenseId, "CONFLICT", null, localIssues, masterFingerprint));
      continue;
    }
    if (!decision || decision.decision === "UNRESOLVED") {
      if (decision) fail("RECONCILIATION_UNRESOLVED");
      plan.push(emptyVocabularyAction(masterSenseId, "BLOCKED", null, localIssues, masterFingerprint));
      continue;
    }
    if (decision.decision === "SKIP") {
      if (!str(decision.reason)?.trim()) fail("RECONCILIATION_SKIP_REASON_REQUIRED");
      if (!reconciliation.allowPartialImport) fail("PARTIAL_IMPORT_NOT_ALLOWED");
      plan.push(emptyVocabularyAction(masterSenseId, "SKIP", null, localIssues, masterFingerprint));
      continue;
    }
    if (decision.decision !== "CREATE_NEW" && decision.decision !== "MAP_EXISTING") {
      fail("RECONCILIATION_DECISION_INVALID");
      plan.push(emptyVocabularyAction(masterSenseId, "CONFLICT", null, localIssues, masterFingerprint));
      continue;
    }

    const existingMapping = mappingBySense.get(masterSenseId);
    const appId: number | null = decision.decision === "MAP_EXISTING" ? num(decision.appVocabularyId)
      : existingMapping?.vocabularyId ?? null;
    if (decision.decision === "MAP_EXISTING" && appId === null) fail("MAP_EXISTING_APP_ID_REQUIRED");
    if (existingMapping && (decision.decision === "MAP_EXISTING" && existingMapping.vocabularyId !== appId
        || decision.decision !== "MAP_EXISTING" && decision.decision !== "CREATE_NEW")) fail("EXISTING_MAPPING_CANNOT_MOVE");
    if (!existingMapping && decision.decision === "CREATE_NEW" && appId !== null) fail("CREATE_NEW_MUST_NOT_PREALLOCATE_ID");
    if (appId !== null) {
      const otherSense = mappingByAppId.get(appId)?.masterSenseId;
      if (otherSense && otherSense !== masterSenseId) fail("APP_VOCABULARY_ID_ALREADY_MAPPED");
      const previous = seenAppIds.get(appId);
      if (previous && previous !== masterSenseId) fail("APP_VOCABULARY_ID_REUSED_IN_RECONCILIATION");
      seenAppIds.set(appId, masterSenseId);
      if (!runtimeById.has(appId)) fail("MAPPED_RUNTIME_VOCABULARY_NOT_FOUND");
    }
    if (localIssues.length) {
      plan.push(emptyVocabularyAction(masterSenseId, "CONFLICT", appId, localIssues, masterFingerprint));
      continue;
    }

    if (decision.decision === "CREATE_NEW" && !existingMapping) {
      const clearFields = decision.clearFields;
      if (clearFields !== undefined && (!Array.isArray(clearFields) || clearFields.length > 0)) fail("CREATE_NEW_CLEAR_FIELDS_NOT_ALLOWED");
      const createProjection = Object.fromEntries(projectionFields.map((field) => [field, masterProjection![field] ?? null]));
      if (typeof createProjection.word !== "string" || typeof createProjection.vietnamese !== "string" || typeof createProjection.enabled !== "boolean") {
        fail("MASTER_REQUIRED_PROJECTION_FIELD_MISSING");
      }
      const createOperations: VocabularyFieldOperation[] = projectionFields.map((field) => {
        const masterRaw = Object.prototype.hasOwnProperty.call(masterProjection, field) ? masterProjection![field] : "ABSENT";
        const value = createProjection[field] ?? null;
        return { field, ownership: VOCABULARY_FIELD_OWNERSHIP[field], action: value === null ? "PRESERVE" : "SET", before: null, masterRaw, after: value };
      });
      const effectiveProjection = effectiveProjectionFromValues(createProjection, null, false);
      const createOutcomes = createOperations.some((operation) => operation.action === "SET") ? ["MASTER_FIELD_UPDATE"] as VocabularyAction["projectionOutcomes"] : [];
      plan.push({
        masterSenseId, action: localIssues.length ? "CONFLICT" : "CREATE",
        mappingAction: localIssues.length ? "CONFLICT" : "CREATE_MAPPING",
        appVocabularyId: null, expectedContentVersion: null, nextContentVersion: localIssues.length ? null : 1,
        masterProjectionFingerprint: masterFingerprint,
        fingerprint: fingerprintEffectiveRuntimeProjection(effectiveProjection, isRecord(record.projectionSemantics) ? record.projectionSemantics : {}, createOperations),
        runtimeProjection: createProjection, effectiveProjection, fieldOperations: createOperations, controlOperations: [], projectionOutcomes: createOutcomes, issues: localIssues,
      });
      continue;
    }

    const runtime = runtimeById.get(appId!)!;
    const clearFieldsValue: unknown = decision.clearFields;
    const clearFields = Array.isArray(clearFieldsValue) ? clearFieldsValue : [];
    if (clearFieldsValue !== undefined && !Array.isArray(clearFieldsValue)) fail("CLEAR_FIELDS_INVALID");
    const clearSet = new Set<VocabularyProjectionField>();
    for (const value of clearFields) {
      if (typeof value !== "string" || !projectionFields.includes(value as VocabularyProjectionField)) {
        fail("CLEAR_FIELD_UNSUPPORTED");
        continue;
      }
      const field = value as VocabularyProjectionField;
      if (clearSet.has(field)) fail("CLEAR_FIELD_DUPLICATE");
      clearSet.add(field);
      if (!clearableProjectionFields.has(field)) fail("CLEAR_FIELD_NOT_NULLABLE");
      if (masterProjection![field] !== null && masterProjection![field] !== undefined) fail("CLEAR_FIELD_MASTER_VALUE_PRESENT");
    }

    const projectedRuntime: JsonRecord = {};
    const fieldOperations: VocabularyFieldOperation[] = [];
    const projectionOutcomes = new Set<VocabularyAction["projectionOutcomes"][number]>();
    for (const field of projectionFields) {
      const before = runtimeProjectionValue(runtime, field);
      const hasMasterField = Object.prototype.hasOwnProperty.call(masterProjection, field);
      const masterRaw = hasMasterField ? masterProjection![field] : "ABSENT";
      const absent = !hasMasterField || masterRaw === null || masterRaw === undefined;
      let operation: VocabularyFieldOperation["action"];
      let after: unknown;
      if (!absent) {
        operation = "SET";
        after = masterRaw;
      } else if (clearSet.has(field)) {
        operation = "CLEAR";
        after = null;
      } else if (VOCABULARY_FIELD_OWNERSHIP[field] === "RUNTIME_ENRICHMENT") {
        operation = "PRESERVE";
        after = before;
      } else if (clearableProjectionFields.has(field)) {
        if (before !== null && before !== undefined) {
          operation = "BLOCKED";
          after = before;
          fail("MASTER_AUTHORITATIVE_NULL_REQUIRES_EXPLICIT_CLEAR");
        } else {
          operation = "PRESERVE";
          after = before;
        }
      } else {
        operation = "BLOCKED";
        after = before;
        fail("MASTER_REQUIRED_PROJECTION_FIELD_MISSING");
      }
      projectedRuntime[field] = after ?? null;
      fieldOperations.push({ field, ownership: VOCABULARY_FIELD_OWNERSHIP[field], action: operation, before, masterRaw, after: after ?? null });
      if (operation === "PRESERVE" && after !== null && after !== undefined) projectionOutcomes.add("PRESERVED_RUNTIME_ENRICHMENT");
      if (operation === "SET" && !same(before, after)) projectionOutcomes.add("MASTER_FIELD_UPDATE");
      if (operation === "CLEAR") projectionOutcomes.add("EXPLICIT_CLEAR");
    }

    const projectedVietnamese = typeof projectedRuntime.vietnamese === "string" ? projectedRuntime.vietnamese : null;
    if (runtime.vietnameseOverride !== null) {
      const overridePolicy = decision.vietnameseOverridePolicy;
      const match = runtime.vietnameseOverride === projectedVietnamese;
      if (overridePolicy === "CLEAR") {
        // This is a separate reviewed runtime override decision.
      } else if (overridePolicy === "KEEP_IF_MATCHES_PROJECTION" && match) {
        // The retained override already equals the Master base value.
      } else {
        const issue: PlanIssue = {
          code: match ? "VIETNAMESE_OVERRIDE_POLICY_REQUIRED" : "VIETNAMESE_OVERRIDE_CONFLICT",
          entityType: "SENSE", entityId: masterSenseId,
          message: match ? "VIETNAMESE_OVERRIDE_POLICY_REQUIRED" : "VIETNAMESE_OVERRIDE_CONFLICT",
        };
        localIssues.push(issue); overrideConflicts.push(issue); issues.push(issue);
      }
    } else if (decision.vietnameseOverridePolicy !== undefined && decision.vietnameseOverridePolicy !== "CLEAR") {
      fail("VIETNAMESE_OVERRIDE_POLICY_INVALID");
    }

    if (runtime.imageQuarantined) {
      const policy = decision.imageQuarantinePolicy;
      const masterSuppliesImage = typeof masterProjection!.imageUrl === "string";
      if (masterSuppliesImage && policy !== "CLEAR") {
        const issue: PlanIssue = { code: "IMAGE_QUARANTINE_CONFLICT", entityType: "SENSE", entityId: masterSenseId, message: "IMAGE_QUARANTINE_CONFLICT" };
        localIssues.push(issue); overrideConflicts.push(issue); issues.push(issue);
      } else if (!masterSuppliesImage && policy !== "CLEAR" && policy !== "KEEP_IF_NO_IMAGE") {
        const issue: PlanIssue = { code: "IMAGE_QUARANTINE_POLICY_REQUIRED", entityType: "SENSE", entityId: masterSenseId, message: "IMAGE_QUARANTINE_POLICY_REQUIRED" };
        localIssues.push(issue); overrideConflicts.push(issue); issues.push(issue);
      } else if (!masterSuppliesImage && policy === "CLEAR" && runtime.imageUrl !== null && !clearSet.has("imageUrl")) {
        const issue: PlanIssue = { code: "IMAGE_QUARANTINE_REVEAL_REQUIRES_EXPLICIT_IMAGE_CLEAR", entityType: "SENSE", entityId: masterSenseId, message: "IMAGE_QUARANTINE_REVEAL_REQUIRES_EXPLICIT_IMAGE_CLEAR" };
        localIssues.push(issue); overrideConflicts.push(issue); issues.push(issue);
      }
    } else if (decision.imageQuarantinePolicy !== undefined && decision.imageQuarantinePolicy !== "CLEAR") {
      fail("IMAGE_QUARANTINE_POLICY_INVALID");
    }

    const overrideAfter = runtime.vietnameseOverride !== null && decision.vietnameseOverridePolicy === "CLEAR" ? null : runtime.vietnameseOverride;
    const quarantineAfter = runtime.imageQuarantined && decision.imageQuarantinePolicy === "CLEAR" ? false : runtime.imageQuarantined;
    const controlOperations: VocabularyAction["controlOperations"] = [
      { field: "vietnameseOverride", action: runtime.vietnameseOverride !== null && overrideAfter === null ? "CLEAR" : "PRESERVE", before: runtime.vietnameseOverride, masterRaw: "NOT_PROJECTED", after: overrideAfter },
      { field: "imageQuarantined", action: runtime.imageQuarantined && !quarantineAfter ? "CLEAR" : "PRESERVE", before: runtime.imageQuarantined, masterRaw: "NOT_PROJECTED", after: quarantineAfter },
    ];
    const policyMutationRequired = runtime.vietnameseOverride !== overrideAfter || runtime.imageQuarantined !== quarantineAfter;
    if (policyMutationRequired) projectionOutcomes.add("EXPLICIT_CLEAR");

    const currentEffective = apiEffectiveProjection(runtime);
    const effectiveProjection = effectiveProjectionFromValues(projectedRuntime, overrideAfter, quarantineAfter);
    const effectiveMatches = same(currentEffective, effectiveProjection);
    const currentStorageProjection = Object.fromEntries(projectionFields.map((field) => [field, runtimeProjectionValue(runtime, field)]));
    const storageProjectionMatches = same(currentStorageProjection, projectedRuntime) && !policyMutationRequired;
    const targetFingerprint = fingerprintEffectiveRuntimeProjection(
      effectiveProjection,
      isRecord(record.projectionSemantics) ? record.projectionSemantics : {},
      fieldOperations,
    );

    const baselinePolicy = decision.firstAdoptionPolicy;
    if (!existingMapping) {
      if (baselinePolicy !== "ADOPT_EXISTING_AS_BASELINE" && baselinePolicy !== "UPDATE_TO_MASTER") fail("FIRST_ADOPTION_POLICY_REQUIRED");
      else if (baselinePolicy === "ADOPT_EXISTING_AS_BASELINE" && (!effectiveMatches || !storageProjectionMatches)) fail("BASELINE_PROJECTION_MISMATCH");
      else if (baselinePolicy === "ADOPT_EXISTING_AS_BASELINE") {
        plan.push({
          masterSenseId, action: localIssues.length ? "CONFLICT" : "NOOP",
          mappingAction: localIssues.length ? "CONFLICT" : "CREATE_MAPPING",
          appVocabularyId: appId, expectedContentVersion: runtime.contentVersion, nextContentVersion: runtime.contentVersion,
          masterProjectionFingerprint: masterFingerprint, fingerprint: targetFingerprint,
          runtimeProjection: projectedRuntime, effectiveProjection, fieldOperations, controlOperations,
          projectionOutcomes: [...projectionOutcomes].sort(), issues: localIssues,
        });
        continue;
      }
    }

    if (existingMapping && existingMapping.projectionContractVersion !== str(record.projectionContractVersion)) {
      const upgrade = decision.projectionContractUpgradePolicy;
      if (upgrade === "REBASE_IF_EFFECTIVE_MATCHES" && effectiveMatches && storageProjectionMatches) {
        plan.push({
          masterSenseId, action: localIssues.length ? "CONFLICT" : "NOOP",
          mappingAction: localIssues.length ? "CONFLICT" : "KEEP_MAPPING",
          appVocabularyId: appId, expectedContentVersion: runtime.contentVersion, nextContentVersion: runtime.contentVersion,
          masterProjectionFingerprint: masterFingerprint, fingerprint: targetFingerprint,
          runtimeProjection: projectedRuntime, effectiveProjection, fieldOperations, controlOperations,
          projectionOutcomes: [...projectionOutcomes].sort(), issues: localIssues,
        });
        continue;
      }
      if (upgrade !== "UPDATE_TO_MASTER") fail("PROJECTION_CONTRACT_RECONCILIATION_REQUIRED");
    }

    const mappingFingerprintMatches = existingMapping?.appliedProjectionFingerprint === targetFingerprint
      && existingMapping.projectionContractVersion === str(record.projectionContractVersion);
    const newRelease = existingMapping?.lastReleaseHash !== undefined
      && existingMapping.lastReleaseHash !== str(artifacts.vocabulary.sourceReleaseHash);
    const explicitRepair = decision.driftPolicy === "UPDATE_TO_MASTER" || clearSet.size > 0
      || decision.vietnameseOverridePolicy === "CLEAR" || decision.imageQuarantinePolicy === "CLEAR" || newRelease;
    if (existingMapping && mappingFingerprintMatches) {
      if ((!effectiveMatches || !storageProjectionMatches) && !explicitRepair) fail("APPLIED_FINGERPRINT_RUNTIME_MISMATCH");
      if (effectiveMatches && storageProjectionMatches && !localIssues.length) {
        plan.push({
          masterSenseId, action: "NOOP", mappingAction: "KEEP_MAPPING", appVocabularyId: appId,
          expectedContentVersion: runtime.contentVersion, nextContentVersion: runtime.contentVersion,
          masterProjectionFingerprint: masterFingerprint, fingerprint: targetFingerprint,
          runtimeProjection: projectedRuntime, effectiveProjection, fieldOperations, controlOperations,
          projectionOutcomes: [...projectionOutcomes].sort(), issues: localIssues,
        });
        continue;
      }
    }

    const learnerFacingChanged = !effectiveMatches;
    const runtimeFieldsChanged = !storageProjectionMatches;
    const mappingNeedsUpdate = !existingMapping || !mappingFingerprintMatches || newRelease;
    if (existingMapping && (!effectiveMatches || runtimeFieldsChanged) && !explicitRepair && mappingFingerprintMatches) {
      fail("APPLIED_FINGERPRINT_RUNTIME_MISMATCH");
    }
    plan.push({
      masterSenseId,
      action: localIssues.length ? "CONFLICT" : runtimeFieldsChanged || policyMutationRequired || mappingNeedsUpdate ? "UPDATE" : "NOOP",
      mappingAction: localIssues.length ? "CONFLICT" : existingMapping ? "KEEP_MAPPING" : "CREATE_MAPPING",
      appVocabularyId: appId,
      expectedContentVersion: runtime.contentVersion,
      nextContentVersion: runtime.contentVersion + (learnerFacingChanged ? 1 : 0),
      masterProjectionFingerprint: masterFingerprint, fingerprint: targetFingerprint,
      runtimeProjection: projectedRuntime, effectiveProjection, fieldOperations, controlOperations,
      projectionOutcomes: [...projectionOutcomes].sort(),
      issues: localIssues,
    });
  }

  for (const id of decisions.keys()) if (!rows.some((record) => record.masterSenseId === id)) addIssue(issues, "RECONCILIATION_SENSE_NOT_IN_RELEASE", "SENSE", id);
  return plan;
}

function planTopics(artifacts: ImportArtifacts, reconciliation: Reconciliation, snapshot: RuntimeSnapshot, issues: PlanIssue[]) {
  const recordsIn = records(artifacts.topics.records);
  const decisions = decisionIndex(reconciliation.topics, "masterTopicId", issues, "TOPIC");
  const mapped = new Map(snapshot.topicMappings.map((row) => [row.masterTopicId, row]));
  const byId = new Map(snapshot.topics.map((row) => [row.id, row]));
  const slugs = new Set(snapshot.topics.map((row) => row.slug));
  const appIds = new Map<number, string>();
  const actions: EntityAction[] = [];
  for (const record of recordsIn) {
    const id = str(record.masterTopicId) ?? "";
    const decision = decisions.get(id);
    const local: PlanIssue[] = [];
    const fail = (code: string) => { addIssue(local, code, "TOPIC", id); addIssue(issues, code, "TOPIC", id); };
    if (!decision || decision.decision === "UNRESOLVED") {
      if (decision) fail("RECONCILIATION_UNRESOLVED");
      actions.push({ masterId: id, action: "BLOCKED", appId: null, issues: local }); continue;
    }
    if (decision.decision === "SKIP") {
      if (!str(decision.reason)?.trim()) fail("RECONCILIATION_SKIP_REASON_REQUIRED");
      if (!reconciliation.allowPartialImport) fail("PARTIAL_IMPORT_NOT_ALLOWED");
      actions.push({ masterId: id, action: "SKIP", appId: null, issues: local }); continue;
    }
    const existingMapping = mapped.get(id);
    const appId = decision.decision === "MAP_EXISTING" ? num(decision.appTopicId)
      : decision.decision === "CREATE_NEW" ? existingMapping?.topicId ?? null : null;
    if (decision.decision !== "MAP_EXISTING" && decision.decision !== "CREATE_NEW") fail("RECONCILIATION_DECISION_INVALID");
    if (decision.decision === "MAP_EXISTING" && appId === null) fail("MAP_EXISTING_APP_ID_REQUIRED");
    if (existingMapping && (decision.decision === "MAP_EXISTING" && existingMapping.topicId !== appId
        || decision.decision !== "MAP_EXISTING" && decision.decision !== "CREATE_NEW")) fail("EXISTING_MAPPING_CANNOT_MOVE");
    if (!existingMapping && decision.decision === "CREATE_NEW" && decision.appTopicId !== undefined) fail("CREATE_NEW_MUST_NOT_PREALLOCATE_ID");
    if (appId !== null) {
      if (!byId.has(appId)) fail("MAPPED_RUNTIME_TOPIC_NOT_FOUND");
      const previous = appIds.get(appId); if (previous && previous !== id) fail("APP_TOPIC_ID_ALREADY_MAPPED"); else appIds.set(appId, id);
    }
    if (decision.decision === "CREATE_NEW" && !existingMapping && slugs.has(str(record.slug) ?? "")) fail("TOPIC_SLUG_COLLISION_REQUIRES_RECONCILIATION");
    if (local.length) actions.push({ masterId: id, action: "CONFLICT", appId, issues: local });
    else if (decision.decision === "CREATE_NEW" && !existingMapping) actions.push({ masterId: id, action: "CREATE", appId: null, issues: [] });
    else if (!existingMapping) actions.push({ masterId: id, action: "MAP_EXISTING", appId, issues: [] });
    else {
      const row = byId.get(appId!)!;
      const sameShape = row.slug === record.slug && row.name === record.name && row.description === record.description && row.sortOrder === record.sortOrder && row.enabled === true;
      actions.push({ masterId: id, action: sameShape ? "NOOP" : "UPDATE", appId, issues: [] });
    }
  }
  for (const id of decisions.keys()) if (!recordsIn.some((record) => record.masterTopicId === id)) addIssue(issues, "RECONCILIATION_TOPIC_NOT_IN_RELEASE", "TOPIC", id);
  return actions;
}

function planLearningSets(artifacts: ImportArtifacts, reconciliation: Reconciliation, snapshot: RuntimeSnapshot, issues: PlanIssue[]) {
  const recordsIn = records(artifacts.learningSets.records);
  const decisions = decisionIndex(reconciliation.learningSets, "masterLearningSetId", issues, "LEARNING_SET");
  const mapped = new Map(snapshot.learningSetMappings.map((row) => [row.masterLearningSetId, row]));
  const byId = new Map(snapshot.learningSets.map((row) => [row.id, row]));
  const slugs = new Set(snapshot.learningSets.map((row) => row.slug));
  const appIds = new Map<number, string>();
  const actions: EntityAction[] = [];
  for (const record of recordsIn) {
    const id = str(record.masterLearningSetId) ?? "";
    const decision = decisions.get(id);
    const local: PlanIssue[] = [];
    const fail = (code: string) => { addIssue(local, code, "LEARNING_SET", id); addIssue(issues, code, "LEARNING_SET", id); };
    if (!decision || decision.decision === "UNRESOLVED") {
      if (decision) fail("RECONCILIATION_UNRESOLVED");
      actions.push({ masterId: id, action: "BLOCKED", appId: null, issues: local }); continue;
    }
    if (decision.decision === "SKIP") {
      if (!str(decision.reason)?.trim()) fail("RECONCILIATION_SKIP_REASON_REQUIRED");
      if (!reconciliation.allowPartialImport) fail("PARTIAL_IMPORT_NOT_ALLOWED");
      actions.push({ masterId: id, action: "SKIP", appId: null, issues: local }); continue;
    }
    const existingMapping = mapped.get(id);
    const appId = decision.decision === "MAP_EXISTING" ? num(decision.appLearningSetId)
      : decision.decision === "CREATE_NEW" ? existingMapping?.learningSetId ?? null : null;
    if (decision.decision !== "MAP_EXISTING" && decision.decision !== "CREATE_NEW") fail("RECONCILIATION_DECISION_INVALID");
    if (decision.decision === "MAP_EXISTING" && appId === null) fail("MAP_EXISTING_APP_ID_REQUIRED");
    if (existingMapping && (decision.decision === "MAP_EXISTING" && existingMapping.learningSetId !== appId
        || decision.decision !== "MAP_EXISTING" && decision.decision !== "CREATE_NEW")) fail("EXISTING_MAPPING_CANNOT_MOVE");
    if (!existingMapping && decision.decision === "CREATE_NEW" && decision.appLearningSetId !== undefined) fail("CREATE_NEW_MUST_NOT_PREALLOCATE_ID");
    if (appId !== null) {
      if (!byId.has(appId)) fail("MAPPED_RUNTIME_LEARNING_SET_NOT_FOUND");
      const previous = appIds.get(appId); if (previous && previous !== id) fail("APP_LEARNING_SET_ID_ALREADY_MAPPED"); else appIds.set(appId, id);
    }
    if (decision.decision === "CREATE_NEW" && !existingMapping && slugs.has(str(record.slug) ?? "")) fail("LEARNING_SET_SLUG_COLLISION_REQUIRES_RECONCILIATION");
    if (decision.decision === "MAP_EXISTING" && decision.membershipPolicy !== "MANAGE_LISTED_MASTER_ITEMS") fail("LEARNING_SET_MEMBERSHIP_OWNERSHIP_POLICY_REQUIRED");
    if (local.length) actions.push({ masterId: id, action: "CONFLICT", appId, issues: local });
    else if (decision.decision === "CREATE_NEW" && !existingMapping) actions.push({ masterId: id, action: "CREATE", appId: null, issues: [] });
    else if (!existingMapping) actions.push({ masterId: id, action: "MAP_EXISTING", appId, issues: [] });
    else {
      const row = byId.get(appId!)!;
      const sameShape = row.slug === record.slug && row.name === record.name && row.description === record.description && row.grade === (record.grade ?? null) && row.enabled === record.enabled && row.sortOrder === record.sortOrder;
      actions.push({ masterId: id, action: sameShape ? "NOOP" : "UPDATE", appId, issues: [] });
    }
  }
  for (const id of decisions.keys()) if (!recordsIn.some((record) => record.masterLearningSetId === id)) addIssue(issues, "RECONCILIATION_LEARNING_SET_NOT_IN_RELEASE", "LEARNING_SET", id);
  return actions;
}

function planMemberships(artifacts: ImportArtifacts, snapshot: RuntimeSnapshot, vocabulary: VocabularyAction[], topics: EntityAction[], sets: EntityAction[], issues: PlanIssue[]): { topics: MembershipAction[]; sets: MembershipAction[] } {
  const vocabByMaster = new Map(vocabulary.filter((action) => action.action !== "SKIP" && action.action !== "CONFLICT" && action.action !== "BLOCKED").map((action) => [action.masterSenseId, action.appVocabularyId]));
  const skippedSenses = new Set(vocabulary.filter((action) => action.action === "SKIP").map((action) => action.masterSenseId));
  const topicByMaster = new Map(topics.filter((action) => action.action !== "SKIP" && action.action !== "CONFLICT" && action.action !== "BLOCKED").map((action) => [action.masterId, action.appId]));
  const skippedTopics = new Set(topics.filter((action) => action.action === "SKIP").map((action) => action.masterId));
  const setByMaster = new Map(sets.filter((action) => action.action !== "SKIP" && action.action !== "CONFLICT" && action.action !== "BLOCKED").map((action) => [action.masterId, action.appId]));
  const skippedSets = new Set(sets.filter((action) => action.action === "SKIP").map((action) => action.masterId));
  const topicPairs = new Set(snapshot.vocabularyTopics.map((pair) => `${pair.vocabularyId}:${pair.topicId}`));
  const trackedTopicPairs = new Map(snapshot.masterVocabularyTopicMemberships.map((pair) => [`${pair.masterSenseId}:${pair.masterTopicId}`, pair]));
  const topicActions: MembershipAction[] = [];
  for (const row of records(artifacts.topicMemberships.records)) {
    const sense = str(row.masterSenseId) ?? ""; const topic = str(row.masterTopicId) ?? "";
    const vocabularyResolved = vocabByMaster.has(sense); const topicResolved = topicByMaster.has(topic);
    const vocabularyId = vocabByMaster.get(sense) ?? null; const topicId = topicByMaster.get(topic) ?? null; const local: PlanIssue[] = [];
    const tracked = trackedTopicPairs.get(`${sense}:${topic}`);
    const trackedMismatch = tracked !== undefined && (tracked.vocabularyId !== vocabularyId || tracked.topicId !== topicId);
    const action: MembershipAction["action"] = skippedSenses.has(sense) || skippedTopics.has(topic) ? "SKIP"
      : !vocabularyResolved || !topicResolved ? "BLOCKED"
      : vocabularyId === null || topicId === null ? "INSERT"
      : trackedMismatch ? "CONFLICT"
      : !topicPairs.has(`${vocabularyId}:${topicId}`) ? "INSERT"
      : tracked ? "NOOP" : "ADOPT_EXISTING";
    if (action === "BLOCKED") { addIssue(local, "TOPIC_MEMBERSHIP_MAPPING_UNRESOLVED", "TOPIC_MEMBERSHIP", `${sense}:${topic}`); addIssue(issues, "TOPIC_MEMBERSHIP_MAPPING_UNRESOLVED", "TOPIC_MEMBERSHIP", `${sense}:${topic}`); }
    if (action === "CONFLICT") { addIssue(local, "TRACKED_TOPIC_MEMBERSHIP_IDENTITY_MISMATCH", "TOPIC_MEMBERSHIP", `${sense}:${topic}`); addIssue(issues, "TRACKED_TOPIC_MEMBERSHIP_IDENTITY_MISMATCH", "TOPIC_MEMBERSHIP", `${sense}:${topic}`); }
    topicActions.push({ masterSenseId: sense, masterContainerId: topic, appVocabularyId: vocabularyId ?? null, appContainerId: topicId ?? null, action, issues: local });
  }

  const setPairs = new Map(snapshot.learningSetItems.map((item) => [`${item.learningSetId}:${item.vocabularyId}`, item]));
  const trackedSetPairs = new Map(snapshot.masterLearningSetMemberships.map((item) => [`${item.masterLearningSetId}:${item.masterSenseId}`, item]));
  const setActions: MembershipAction[] = [];
  for (const row of records(artifacts.learningSetItems.records)) {
    const sense = str(row.masterSenseId) ?? ""; const set = str(row.masterLearningSetId) ?? ""; const itemId = str(row.learningSetItemId) ?? "";
    const vocabularyResolved = vocabByMaster.has(sense); const setResolved = setByMaster.has(set);
    const vocabularyId = vocabByMaster.get(sense) ?? null; const setId = setByMaster.get(set) ?? null; const position = num(row.position) ?? 0; const local: PlanIssue[] = [];
    const existing = vocabularyId === null || setId === null ? undefined : setPairs.get(`${setId}:${vocabularyId}`);
    const tracked = trackedSetPairs.get(`${set}:${sense}`);
    const trackedMismatch = tracked !== undefined && (tracked.masterLearningSetItemId !== itemId || tracked.learningSetId !== setId || tracked.vocabularyId !== vocabularyId);
    const action: MembershipAction["action"] = skippedSenses.has(sense) || skippedSets.has(set) ? "SKIP"
      : !vocabularyResolved || !setResolved ? "BLOCKED"
      : vocabularyId === null || setId === null ? "INSERT"
      : trackedMismatch ? "CONFLICT"
      : !existing ? "INSERT"
      : tracked ? existing.sortOrder === position ? "NOOP" : "UPDATE_ORDER"
      : existing.sortOrder === position ? "ADOPT_EXISTING" : "UPDATE_ORDER";
    if (action === "BLOCKED") { addIssue(local, "LEARNING_SET_MEMBERSHIP_MAPPING_UNRESOLVED", "LEARNING_SET_ITEM", itemId); addIssue(issues, "LEARNING_SET_MEMBERSHIP_MAPPING_UNRESOLVED", "LEARNING_SET_ITEM", itemId); }
    if (action === "CONFLICT") { addIssue(local, "TRACKED_LEARNING_SET_MEMBERSHIP_IDENTITY_MISMATCH", "LEARNING_SET_ITEM", itemId); addIssue(issues, "TRACKED_LEARNING_SET_MEMBERSHIP_IDENTITY_MISMATCH", "LEARNING_SET_ITEM", itemId); }
    setActions.push({ masterSenseId: sense, masterContainerId: set, masterItemId: itemId, appVocabularyId: vocabularyId ?? null, appContainerId: setId ?? null, position, action, issues: local });
  }
  return { topics: topicActions, sets: setActions };
}

export function buildMasterVocabularyImportPlan(input: {
  artifacts: ImportArtifacts;
  reconciliation: Reconciliation;
  snapshot?: RuntimeSnapshot;
  targetEnvironment?: string;
  expectedSnapshotFingerprint?: string;
  expectedPlannerSnapshotFingerprint?: string;
  targetIdentity?: JsonRecord;
  mode?: "DRY_RUN" | "APPLY";
}): ImportPlan {
  const { artifacts, reconciliation } = input;
  const snapshot = input.snapshot ?? emptySnapshot();
  const snapshotFingerprint = canonicalJsonSha256(snapshot);
  const issues: PlanIssue[] = [];
  const overrideConflicts: PlanIssue[] = [];
  metadataMatches(artifacts, reconciliation, issues);
  if (input.expectedSnapshotFingerprint !== undefined
      && reconciliation.snapshotFingerprint !== input.expectedSnapshotFingerprint) {
    addIssue(issues, "RECONCILIATION_SNAPSHOT_EVIDENCE_MISMATCH", "RECONCILIATION");
  }
  if (input.expectedPlannerSnapshotFingerprint !== undefined
      && reconciliation.plannerSnapshotFingerprint !== input.expectedPlannerSnapshotFingerprint) {
    addIssue(issues, "RECONCILIATION_PLANNER_SNAPSHOT_MISMATCH", "RECONCILIATION");
  }
  if (input.targetIdentity !== undefined && !same(reconciliation.target, input.targetIdentity)) {
    addIssue(issues, "RECONCILIATION_TARGET_MISMATCH", "RECONCILIATION");
  }
  const source = artifacts.vocabulary;
  const releaseHash = str(source.sourceReleaseHash);
  const projectionContractVersion = str(source.projectionContractVersion);
  if (source.artifactVersion !== MASTER_APP_IMPORT_VERSION || source.mode !== "RELEASE") addIssue(issues, "APP_IMPORT_RELEASE_ARTIFACT_REQUIRED", "ARTIFACT");
  if (source.importEligible !== true || source.sourceManifestStatus !== "APPROVED" || !hasValidDigest(releaseHash)) addIssue(issues, "IMPORT_ARTIFACT_NOT_ELIGIBLE", "ARTIFACT");
  if (projectionContractVersion !== MASTER_RUNTIME_PROJECTION_VERSION) addIssue(issues, "PROJECTION_CONTRACT_UNSUPPORTED", "ARTIFACT");
  for (const [key, artifact] of [["topics", artifacts.topics], ["learningSets", artifacts.learningSets], ["learningSetItems", artifacts.learningSetItems], ["topicMemberships", artifacts.topicMemberships]] as const) {
    if (artifact.importEligible !== true || artifact.sourceManifestStatus !== "APPROVED" || artifact.sourceReleaseHash !== releaseHash) addIssue(issues, "APP_IMPORT_ARTIFACT_METADATA_MISMATCH", "ARTIFACT", key);
  }
  const reconciliationHash = canonicalJsonSha256(reconciliation);
  const vocabulary = planVocabulary(artifacts, reconciliation, snapshot, issues, overrideConflicts);
  const topics = planTopics(artifacts, reconciliation, snapshot, issues);
  const learningSets = planLearningSets(artifacts, reconciliation, snapshot, issues);
  const memberships = planMemberships(artifacts, snapshot, vocabulary, topics, learningSets, issues);
  const ids = (values: unknown[]) => values.map(str).filter((id): id is string => id !== null);
  const senseSet = new Set(ids(records(artifacts.vocabulary.records).map((row) => row.masterSenseId)));
  const topicSet = new Set(ids(records(artifacts.topics.records).map((row) => row.masterTopicId)));
  const setSet = new Set(ids(records(artifacts.learningSets.records).map((row) => row.masterLearningSetId)));
  const unresolved = (entries: JsonRecord[], key: string, expected: Set<string>) => [...expected].filter((id) => {
    const entry = entries.find((candidate) => candidate[key] === id);
    return !entry || entry.decision === "UNRESOLVED";
  }).length;
  const vocabularyUnresolved = unresolved(reconciliation.vocabulary, "masterSenseId", senseSet);
  const topicsUnresolved = unresolved(reconciliation.topics, "masterTopicId", topicSet);
  const setsUnresolved = unresolved(reconciliation.learningSets, "masterLearningSetId", setSet);
  const reconciliationComplete = vocabularyUnresolved === 0 && topicsUnresolved === 0 && setsUnresolved === 0
    && !issues.some((issue) => issue.code.includes("RECONCILIATION") || issue.code.includes("MAPPING") || issue.code.includes("SLUG_COLLISION"));
  const eligibilityIssues = issues.some((issue) => issue.code === "IMPORT_ARTIFACT_NOT_ELIGIBLE" || issue.code === "APP_IMPORT_RELEASE_ARTIFACT_REQUIRED" || issue.code === "PROJECTION_CONTRACT_UNSUPPORTED");
  const blockingActions = [...vocabulary.map((item) => item.action), ...topics.map((item) => item.action), ...learningSets.map((item) => item.action), ...memberships.topics.map((item) => item.action), ...memberships.sets.map((item) => item.action)].some((action) => ["CONFLICT", "BLOCKED"].includes(action));
  const appliedKeyMatch = snapshot.appliedRuns.find((run) => run.datasetId === str(source.sourceDatasetId) && run.releaseHash === releaseHash && run.appImportContractVersion === source.artifactVersion && run.projectionContractVersion === projectionContractVersion && run.reconciliationHash === reconciliationHash);
  const mutatingAction = [...vocabulary.map((item) => item.action), ...topics.map((item) => item.action), ...learningSets.map((item) => item.action), ...memberships.topics.map((item) => item.action), ...memberships.sets.map((item) => item.action)].some((action) => ["CREATE", "UPDATE", "INSERT", "UPDATE_ORDER", "ADOPT_EXISTING", "MAP_EXISTING"].includes(action));
  if (appliedKeyMatch && mutatingAction) addIssue(issues, "APPLIED_RELEASE_STATE_DRIFT_REQUIRES_REVIEW", "RELEASE", releaseHash ?? undefined);
  const canApply = !eligibilityIssues && reconciliationComplete && !blockingActions && !overrideConflicts.length && !issues.length;
  const mappingSenseIds = new Set(snapshot.vocabularyMappings.map((row) => row.masterSenseId));
  const mappingTopicIds = new Set(snapshot.topicMappings.map((row) => row.masterTopicId));
  const mappingSetIds = new Set(snapshot.learningSetMappings.map((row) => row.masterLearningSetId));
  const mappedVocabularyIds = new Set(snapshot.vocabularyMappings.map((row) => row.vocabularyId));
  const targetEnvironment = input.targetEnvironment ?? "NOT_CONNECTED";
  const partial: Omit<ImportPlan, "planFingerprint"> = {
    planVersion: "master-runtime-import-plan-v2", mode: input.mode ?? "DRY_RUN", targetEnvironment,
    source: {
      datasetId: str(source.sourceDatasetId), datasetVersion: str(source.sourceDatasetVersion), schemaVersion: str(source.sourceSchemaVersion),
      manifestStatus: str(source.sourceManifestStatus), releaseHash, appImportContractVersion: str(source.artifactVersion), projectionContractVersion,
    },
    eligibility: { importEligible: source.importEligible === true && source.sourceManifestStatus === "APPROVED" && hasValidDigest(releaseHash), reconciliationComplete, canApply },
    reconciliation: {
      hash: reconciliationHash,
      vocabularyResolved: records(artifacts.vocabulary.records).length - vocabularyUnresolved,
      vocabularyUnresolved,
      topicsResolved: records(artifacts.topics.records).length - topicsUnresolved,
      topicsUnresolved,
      learningSetsResolved: records(artifacts.learningSets.records).length - setsUnresolved,
      learningSetsUnresolved: setsUnresolved,
    },
    vocabulary, topics, learningSets, topicMemberships: memberships.topics, learningSetMemberships: memberships.sets,
    absentExistingMasterMappings: {
      senses: [...mappingSenseIds].filter((id) => !senseSet.has(id)).length,
      topics: [...mappingTopicIds].filter((id) => !topicSet.has(id)).length,
      learningSets: [...mappingSetIds].filter((id) => !setSet.has(id)).length,
    },
    overrideConflicts, issues,
    summary: {
      vocabularyCreates: actionCount(vocabulary, "CREATE"), vocabularyUpdates: actionCount(vocabulary, "UPDATE"),
      vocabularyNoops: actionCount(vocabulary, "NOOP"), vocabularyConflicts: actionCount(vocabulary, "CONFLICT"),
      vocabularyBlocked: actionCount(vocabulary, "BLOCKED"), vocabularySkipped: actionCount(vocabulary, "SKIP"),
      newMappings: actionCount(vocabulary, "CREATE"), existingMappings: vocabulary.filter((item) => item.mappingAction === "KEEP_MAPPING").length,
      contentVersionIncrements: vocabulary.filter((item) => item.nextContentVersion !== null && item.expectedContentVersion !== null && item.nextContentVersion > item.expectedContentVersion).length,
      topicCreates: actionCount(topics, "CREATE"), topicUpdates: actionCount(topics, "UPDATE"), topicNoops: actionCount(topics, "NOOP"), topicConflicts: actionCount(topics, "CONFLICT"),
      learningSetCreates: actionCount(learningSets, "CREATE"), learningSetUpdates: actionCount(learningSets, "UPDATE"), learningSetNoops: actionCount(learningSets, "NOOP"), learningSetConflicts: actionCount(learningSets, "CONFLICT"),
      topicMembershipInserts: actionCount(memberships.topics, "INSERT"), topicMembershipAdoptions: actionCount(memberships.topics, "ADOPT_EXISTING"), topicMembershipNoops: actionCount(memberships.topics, "NOOP"), topicMembershipSkipped: actionCount(memberships.topics, "SKIP"),
      learningSetMembershipInserts: actionCount(memberships.sets, "INSERT"), learningSetMembershipOrderUpdates: actionCount(memberships.sets, "UPDATE_ORDER"), learningSetMembershipAdoptions: actionCount(memberships.sets, "ADOPT_EXISTING"), learningSetMembershipNoops: actionCount(memberships.sets, "NOOP"), learningSetMembershipSkipped: actionCount(memberships.sets, "SKIP"),
      issueCount: issues.length,
    },
    historySafety: {
      learnerProgressRows: snapshot.progressVocabularyIds.length,
      reviewEvents: snapshot.reviewVocabularyIds.length,
      mappedProgressReferences: snapshot.progressVocabularyIds.filter((id) => mappedVocabularyIds.has(id)).length,
      mappedReviewReferences: snapshot.reviewVocabularyIds.filter((id) => mappedVocabularyIds.has(id)).length,
      deletionsPlanned: 0, learnerAssignmentsChanged: 0,
    },
    snapshotFingerprint,
  };
  const fingerprintPayload = Object.fromEntries(Object.entries(partial).filter(([key]) => key !== "mode"));
  return { ...partial, planFingerprint: canonicalJsonSha256(fingerprintPayload) };
}

export { emptySnapshot, apiEffectiveProjection };
