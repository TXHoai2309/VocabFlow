import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TrustedSource } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertCurationDatabaseAccess,
  configuredCurationTarget,
  resolveCurationTargetName,
} from "./vocabulary-curation-access";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import {
  databaseHashMatchesMigrationSource,
  matchingMigrationHashRepresentation,
  readMigrationHashEvidence,
  type MigrationHashEvidence,
} from "./migration-hash-verification";
import { buildMasterVocabularyImportPlan, type ImportArtifacts, type JsonRecord } from "./master-vocabulary-v2-import-planner";
import {
  fingerprintDevelopmentReconciliationSnapshot,
  scanMasterVocabularyV2ReadOnlySnapshot,
  type MasterLearningSetCandidate,
  type MasterRuntimeCandidate,
  type ReadOnlySnapshot,
} from "./master-vocabulary-v2-read-only-reconciliation-scan";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";
import { runMasterVocabularyTransform } from "./transform-master-vocabulary-v2";
import {
  buildOwnerReconciliationProposal,
  proposalHasOnlyUnresolvedOwnerDecisions,
  renderOwnerReconciliationReview,
  type AppleIdentityAudit,
} from "./master-vocabulary-v2-owner-reconciliation-proposal";

const EXPECTED_RELEASE_HASH = "fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591";
const RELEASE_RELATIVE_ROOT = "vocabflow-dataset/releases/canary-v2.1.0";
const CANDIDATE_RELATIVE_PATH = "import/mappings/runtime-reconciliation-candidates-development-v2.json";
const REPORT_RELATIVE_PATH = "vocabflow-dataset/reports/canary-development-reconciliation-scan.md";
const OWNER_PROPOSAL_RELATIVE_PATH = "import/mappings/runtime-reconciliation-proposal-development-v2.json";
const OWNER_REVIEW_RELATIVE_PATH = "vocabflow-dataset/reports/canary-development-owner-reconciliation-review.md";

type JournalEntry = { idx: number; when: number; tag: string };
type DbMigrationRow = { id: number; hash: string; created_at: string | number | null };
type MigrationCheck = {
  tableExists: boolean;
  current: boolean;
  localMigrationCount: number;
  appliedCount: number;
  latestApplied: { id: number; tag: string | null; hash: string; createdAt: number | null } | null;
  requiredMigrations: Array<{ idx: number; tag: string; expectedHash: string | null; appliedHash: string | null; applied: boolean }>;
  missingMigrations: string[];
  missingJournalRows: string[];
  historicalHashMismatches: Array<{ tag: string; expectedHash: string; appliedHash: string }>;
  unexpectedAppliedRows: Array<{ id: number; hash: string; createdAt: number | null }>;
  appliedMigrationsForFingerprint: Array<{ tag: string; hash: string }>;
  hashComparisons: Array<{
    tag: string;
    databaseHash: string | null;
    worktreeRawHash: string | null;
    lfHash: string | null;
    crlfHash: string | null;
    crHash: string | null;
    matchedRepresentation: "LF" | "CRLF" | "CR" | "NO_MATCH" | null;
  }>;
};

function loadRepositoryEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  try { loadEnvFile(envPath); } catch { throw new Error("ENV_FILE_INVALID"); }
}

function readJsonFile<T>(filePath: string): T {
  try { return JSON.parse(readFileSync(filePath, "utf8")) as T; }
  catch { throw new Error("DEVELOPMENT_SCAN_ARTIFACT_READ_FAILED"); }
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((row): row is JsonRecord => typeof row === "object" && row !== null && !Array.isArray(row))
    : [];
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((row): row is string => typeof row === "string") : [];
}

function asString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw new Error("DEVELOPMENT_SCAN_ARTIFACT_INVALID");
  return value;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(result)) throw new Error("DEVELOPMENT_SCAN_DATABASE_VALUE_INVALID");
  return result;
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : asNumber(value);
}

function parseRelease(datasetRoot: string): {
  releaseHash: string;
  artifacts: ImportArtifacts;
  reconciliationTemplate: JsonRecord;
  masters: MasterRuntimeCandidate[];
  learningSets: MasterLearningSetCandidate[];
  learningSetItems: JsonRecord[];
} {
  const manifest = readJsonFile<JsonRecord>(path.join(datasetRoot, "dataset.json"));
  if (manifest.datasetVersion !== "2.1.0" || manifest.schemaVersion !== "2.0.1"
    || manifest.status !== "APPROVED" || manifest.releaseHash !== EXPECTED_RELEASE_HASH) {
    throw new Error("APPROVED_CANARY_RELEASE_IDENTITY_MISMATCH");
  }
  const transformed = runMasterVocabularyTransform({ datasetRoot, mode: "RELEASE", writeOutputs: false });
  if (transformed.vocabulary.importEligible !== true || transformed.vocabulary.mode !== "RELEASE"
    || transformed.vocabulary.sourceReleaseHash !== EXPECTED_RELEASE_HASH) {
    throw new Error("APPROVED_CANARY_RELEASE_NOT_IMPORT_ELIGIBLE");
  }
  const artifactPaths = {
    vocabulary: "import/vocabulary-import-v2.json",
    topics: "import/topics-import-v2.json",
    learningSets: "import/learning-sets-import-v2.json",
    learningSetItems: "import/learning-set-items-import-v2.json",
    topicMemberships: "import/topic-memberships-import-v2.json",
  } as const;
  const artifacts = {
    vocabulary: transformed.vocabulary,
    topics: transformed.topics,
    learningSets: transformed.learningSets,
    learningSetItems: transformed.learningSetItems,
    topicMemberships: transformed.topicMemberships,
  } satisfies ImportArtifacts;
  for (const [key, relativePath] of Object.entries(artifactPaths)) {
    const saved = readJsonFile<JsonRecord>(path.join(datasetRoot, relativePath));
    if (canonicalJsonSha256(saved) !== canonicalJsonSha256(artifacts[key as keyof typeof artifacts])) {
      throw new Error("APPROVED_CANARY_RELEASE_TRANSFORM_MISMATCH");
    }
  }
  const reconciliationTemplate = readJsonFile<JsonRecord>(path.join(datasetRoot, "import/mappings/runtime-reconciliation-template-v2.json"));
  const manifestSenses = asRecords(manifest.includedSenses);
  const senseRecords = manifestSenses.map((pin) => readJsonFile<JsonRecord>(path.join(datasetRoot, asString(pin.recordPath))));
  const mastersById = new Map(senseRecords.map((record) => [asString(record.masterSenseId), record]));
  const lexemePins = asRecords(manifest.includedLexemes);
  const lexemeRecords = lexemePins.map((pin) => readJsonFile<JsonRecord>(path.join(datasetRoot, asString(pin.recordPath))));
  const lexemesById = new Map(lexemeRecords.map((record) => [asString(record.masterLexemeId), record]));
  const importRows = asRecords(artifacts.vocabulary.records);
  const masters: MasterRuntimeCandidate[] = importRows.map((row) => {
    const masterSenseId = asString(row.masterSenseId);
    const masterLexemeId = asString(row.masterLexemeId);
    const sense = mastersById.get(masterSenseId);
    const lexeme = lexemesById.get(masterLexemeId);
    const projection = row.runtimeProjection;
    if (!sense || !lexeme || typeof projection !== "object" || projection === null || Array.isArray(projection)) {
      throw new Error("APPROVED_CANARY_MASTER_RECORD_INVALID");
    }
    const projected = projection as JsonRecord;
    const lemma = asString(lexeme.lemma);
    return {
      masterLexemeId,
      masterSenseId,
      lemma,
      normalizedLemma: typeof lexeme.normalizedLemma === "string" ? lexeme.normalizedLemma : lemma.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US"),
      projection: {
        word: asString(projected.word),
        ipa: asNullableString(projected.ipa),
        vietnamese: asString(projected.vietnamese),
        definitionEn: asNullableString(projected.definitionEn),
        exampleEn: asNullableString(projected.exampleEn),
        imageUrl: asNullableString(projected.imageUrl),
        audioUrl: asNullableString(projected.audioUrl),
        topic: asNullableString(projected.topic),
        level: asNullableString(projected.level),
        enabled: projected.enabled === true,
      },
    };
  });
  const learningSets = asRecords(artifacts.learningSets.records).map((row) => ({
    masterLearningSetId: asString(row.masterLearningSetId),
    code: asString(row.code),
    slug: asString(row.slug),
    name: asString(row.name),
  }));
  const learningSetItems = asRecords(artifacts.learningSetItems.records);
  if (masters.length !== 8 || learningSets.length !== 1 || learningSets[0]?.code !== "TECHNOLOGY_STARTER"
    || learningSetItems.length !== 1 || asString(learningSetItems[0]?.masterSenseId) !== "01a0fc13-09ef-710c-8e76-753a5cfea69c"
    || asRecords(artifacts.topics.records).length !== 0) {
    throw new Error("APPROVED_CANARY_RELEASE_SCOPE_MISMATCH");
  }
  return { releaseHash: EXPECTED_RELEASE_HASH, artifacts, reconciliationTemplate, masters, learningSets, learningSetItems };
}

function readJournalEntries(): JournalEntry[] {
  const journal = readJsonFile<{ entries: JournalEntry[] }>(path.join(process.cwd(), "drizzle/migrations/meta/_journal.json"));
  return [...journal.entries].sort((left, right) => left.idx - right.idx);
}

function migrationRowsState(entries: JournalEntry[], dbRows: DbMigrationRow[], localHashes: Map<number, MigrationHashEvidence>, tableExists: boolean): MigrationCheck {
  const dbByCreatedAt = new Map(dbRows.map((row) => [row.created_at === null ? null : Number(row.created_at), row]));
  const requiredTags = new Set(["0015_clean_yellowjacket", "0016_nostalgic_mattie_franklin", "0017_nosy_hellfire_club"]);
  const requiredMigrations = entries.filter((entry) => requiredTags.has(entry.tag)).map((entry) => {
    const evidence = localHashes.get(entry.when);
    const actual = dbByCreatedAt.get(entry.when);
    return {
      idx: entry.idx,
      tag: entry.tag,
      expectedHash: evidence?.lfHash ?? null,
      appliedHash: actual?.hash ?? null,
      applied: evidence !== undefined && actual !== undefined && databaseHashMatchesMigrationSource(evidence, actual.hash),
    };
  });
  const expectedHistory = entries.map((entry) => ({ entry, evidence: localHashes.get(entry.when) }));
  const missingJournalRows = expectedHistory
    .filter(({ entry, evidence }) => !evidence || !dbByCreatedAt.has(entry.when))
    .map(({ entry }) => entry.tag);
  const historicalHashMismatches = expectedHistory.flatMap(({ entry, evidence }) => {
    const appliedHash = dbByCreatedAt.get(entry.when)?.hash;
    return evidence && appliedHash && matchingMigrationHashRepresentation(evidence, appliedHash) === "NO_MATCH"
      ? [{ tag: entry.tag, expectedHash: evidence.lfHash, appliedHash }]
      : [];
  });
  const hashComparisons = expectedHistory.map(({ entry, evidence }) => {
    const appliedHash = dbByCreatedAt.get(entry.when)?.hash ?? null;
    return {
      tag: entry.tag,
      databaseHash: appliedHash,
      worktreeRawHash: evidence?.worktreeHash ?? null,
      lfHash: evidence?.lfHash ?? null,
      crlfHash: evidence?.crlfHash ?? null,
      crHash: evidence?.crHash ?? null,
      matchedRepresentation: evidence && appliedHash
        ? matchingMigrationHashRepresentation(evidence, appliedHash)
        : null,
    };
  });
  const missingMigrations = expectedHistory
    .filter(({ entry, evidence }) => !evidence || !dbByCreatedAt.has(entry.when))
    .map(({ entry }) => entry.tag);
  const expectedByWhen = new Map(expectedHistory.map(({ entry, evidence }) => [entry.when, evidence?.lfHash]));
  const unexpectedAppliedRows = dbRows.filter((row) => {
    const createdAt = row.created_at === null ? null : Number(row.created_at);
    return createdAt === null || !expectedByWhen.has(createdAt);
  }).map((row) => ({ id: row.id, hash: row.hash, createdAt: row.created_at === null ? null : Number(row.created_at) }));
  const latestRow = [...dbRows].sort((left, right) => Number(right.created_at ?? 0) - Number(left.created_at ?? 0) || right.id - left.id)[0] ?? null;
  const latestCreatedAt = latestRow?.created_at === null || latestRow?.created_at === undefined ? null : Number(latestRow.created_at);
  const latestEntry = latestCreatedAt === null ? null : entries.find((entry) => entry.when === latestCreatedAt) ?? null;
  const current = tableExists && missingJournalRows.length === 0 && unexpectedAppliedRows.length === 0
    && dbRows.length === entries.length && requiredMigrations.length === requiredTags.size && requiredMigrations.every((row) => row.applied);
  return {
    tableExists,
    current,
    localMigrationCount: entries.length,
    appliedCount: dbRows.length,
    latestApplied: latestRow ? {
      id: latestRow.id,
      tag: latestEntry?.tag ?? null,
      hash: latestRow.hash,
      createdAt: latestCreatedAt,
    } : null,
    requiredMigrations,
    missingMigrations,
    missingJournalRows,
    historicalHashMismatches,
    unexpectedAppliedRows,
    hashComparisons,
    appliedMigrationsForFingerprint: dbRows.map((row) => {
      const createdAt = row.created_at === null ? null : Number(row.created_at);
      const entry = createdAt === null ? null : entries.find((candidate) => candidate.when === createdAt) ?? null;
      return { tag: entry?.tag ?? `UNKNOWN_CREATED_AT_${createdAt ?? "NULL"}`, hash: row.hash };
    }).sort((left, right) => left.tag.localeCompare(right.tag)),
  };
}

async function readDevelopmentMigrationState(input: {
  url: string;
  target: ReturnType<typeof getConnectionTarget>;
  entries: JournalEntry[];
  localHashes: Map<number, MigrationHashEvidence>;
}): Promise<MigrationCheck> {
  const sql = openSql(input.url);
  try {
    return await sql.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, input.target);
      const [session] = await tx<{ current_user: string; session_user: string; database_name: string }[]>`
        SELECT current_user::text AS current_user, session_user::text AS session_user, current_database()::text AS database_name
      `;
      if (!session || session.current_user !== input.target.roleName || session.session_user !== input.target.roleName
        || session.database_name !== input.target.databaseName) throw new Error("DEVELOPMENT_MIGRATION_ROLE_OR_DATABASE_MISMATCH");
      const [table] = await tx<{ exists: boolean }[]>`
        SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists
      `;
      const dbRows = table?.exists
        ? await tx<DbMigrationRow[]>`
          SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at, id
        `
        : [];
      return migrationRowsState(input.entries, dbRows, input.localHashes, table?.exists === true);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function mapVocabulary(row: JsonRecord) {
  return {
    id: asNumber(row.id),
    word: asString(row.word),
    ipa: asNullableString(row.ipa),
    vietnamese: asString(row.vietnamese),
    vietnameseOverride: asNullableString(row.vietnamese_override),
    definitionEn: asNullableString(row.definition_en),
    exampleEn: asNullableString(row.example_en),
    imageUrl: asNullableString(row.image_url),
    imageQuarantined: row.image_quarantined === true,
    audioUrl: asNullableString(row.audio_url),
    topic: asNullableString(row.topic),
    level: asNullableString(row.level),
    enabled: row.enabled === true,
    contentVersion: asNumber(row.content_version),
    sourceDataset: asNullableString(row.source_dataset),
    sourceRecordId: nullableNumber(row.source_record_id),
  };
}

async function readDevelopmentRuntimeSnapshot(input: {
  url: string;
  target: ReturnType<typeof getConnectionTarget>;
}): Promise<ReadOnlySnapshot & { appleIdentityAudit: AppleIdentityAudit }> {
  const sql = openSql(input.url);
  try {
    return await sql.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, input.target);
      const [session] = await tx<{ current_user: string; session_user: string; database_name: string }[]>`
        SELECT current_user::text AS current_user, session_user::text AS session_user, current_database()::text AS database_name
      `;
      if (!session || session.current_user !== input.target.roleName || session.session_user !== input.target.roleName
        || session.database_name !== input.target.databaseName) throw new Error("DEVELOPMENT_RUNTIME_ROLE_OR_DATABASE_MISMATCH");

      const [tables] = await tx<{ ready: boolean }[]>`
        SELECT to_regclass('vocabflow_app.vocabularies') IS NOT NULL
          AND to_regclass('vocabflow_app.learning_sets') IS NOT NULL
          AND to_regclass('vocabflow_app.learning_set_items') IS NOT NULL
          AND to_regclass('vocabflow_app.learner_learning_sets') IS NOT NULL
          AND to_regclass('vocabflow_app.learner_progress') IS NOT NULL
          AND to_regclass('vocabflow_app.review_events') IS NOT NULL
          AND to_regclass('vocabflow_app.topics') IS NOT NULL
          AND to_regclass('vocabflow_app.vocabulary_topics') IS NOT NULL
          AND to_regclass('vocabflow_app.master_vocabulary_mappings') IS NOT NULL
          AND to_regclass('vocabflow_app.master_learning_set_mappings') IS NOT NULL
          AND to_regclass('vocabflow_app.master_vocabulary_import_runs') IS NOT NULL AS ready
      `;
      if (tables?.ready !== true) throw new Error("DEVELOPMENT_RUNTIME_BRIDGE_SCHEMA_NOT_CURRENT");

      const vocabRows = await tx<JsonRecord[]>`
        SELECT id, word, ipa, vietnamese, vietnamese_override, definition_en, example_en, image_url,
          image_quarantined, audio_url, topic, level, enabled, content_version, source_dataset, source_record_id
        FROM "vocabflow_app"."vocabularies" ORDER BY id
      `;
      const mappingRows = await tx<JsonRecord[]>`
        SELECT master_sense_id, master_lexeme_id, vocabulary_id, projection_contract_version,
          applied_projection_fingerprint, last_release_hash
        FROM "vocabflow_app"."master_vocabulary_mappings" ORDER BY master_sense_id
      `;
      const learningSetRows = await tx<JsonRecord[]>`
        SELECT id, slug, name, description, grade, enabled, sort_order
        FROM "vocabflow_app"."learning_sets" ORDER BY id
      `;
      const learningSetMappingRows = await tx<JsonRecord[]>`
        SELECT master_learning_set_id, learning_set_id
        FROM "vocabflow_app"."master_learning_set_mappings" ORDER BY master_learning_set_id
      `;
      const learningSetItemRows = await tx<JsonRecord[]>`
        SELECT learning_set_id, vocabulary_id, sort_order
        FROM "vocabflow_app"."learning_set_items" ORDER BY learning_set_id, sort_order, vocabulary_id
      `;
      const learningSetMembershipRows = await tx<JsonRecord[]>`
        SELECT master_learning_set_item_id, master_learning_set_id, master_sense_id, learning_set_id, vocabulary_id, sort_order
        FROM "vocabflow_app"."master_learning_set_memberships" ORDER BY master_learning_set_id, master_sense_id
      `;
      const assignmentRows = await tx<JsonRecord[]>`
        SELECT learning_set_id, count(*)::int AS learner_assignment_count,
          count(*) FILTER (WHERE active = true)::int AS active_learner_assignment_count
        FROM "vocabflow_app"."learner_learning_sets" GROUP BY learning_set_id ORDER BY learning_set_id
      `;
      const progressRows = await tx<JsonRecord[]>`
        SELECT vocabulary_id, count(*)::int AS reference_count
        FROM "vocabflow_app"."learner_progress" GROUP BY vocabulary_id ORDER BY vocabulary_id
      `;
      const reviewRows = await tx<JsonRecord[]>`
        SELECT vocabulary_id, count(*)::int AS reference_count
        FROM "vocabflow_app"."review_events" GROUP BY vocabulary_id ORDER BY vocabulary_id
      `;
      const appliedRunRows = await tx<JsonRecord[]>`
        SELECT dataset_id, release_hash, app_import_contract_version, projection_contract_version, reconciliation_hash, plan_fingerprint
        FROM "vocabflow_app"."master_vocabulary_import_runs" ORDER BY applied_at, id
      `;
      const appleLearningSetRows = await tx<JsonRecord[]>`
        SELECT lsi.vocabulary_id, ls.id AS learning_set_id, ls.slug, ls.name, ls.enabled, lsi.sort_order
        FROM "vocabflow_app"."learning_set_items" lsi
        JOIN "vocabflow_app"."learning_sets" ls ON ls.id = lsi.learning_set_id
        WHERE lsi.vocabulary_id IN (1, 295)
        ORDER BY lsi.vocabulary_id, ls.id, lsi.sort_order
      `;
      const appleTopicRows = await tx<JsonRecord[]>`
        SELECT vt.vocabulary_id, t.id AS topic_id, t.slug, t.name, t.enabled
        FROM "vocabflow_app"."vocabulary_topics" vt
        JOIN "vocabflow_app"."topics" t ON t.id = vt.topic_id
        WHERE vt.vocabulary_id IN (1, 295)
        ORDER BY vt.vocabulary_id, t.id
      `;
      const appleProgressRows = await tx<JsonRecord[]>`
        SELECT vocabulary_id, status::text AS status, count(*)::int AS row_count
        FROM "vocabflow_app"."learner_progress"
        WHERE vocabulary_id IN (1, 295)
        GROUP BY vocabulary_id, status
        ORDER BY vocabulary_id, status
      `;
      const appleReviewRows = await tx<JsonRecord[]>`
        SELECT vocabulary_id, count(*)::int AS row_count,
          min(reviewed_at)::text AS earliest_review, max(reviewed_at)::text AS latest_review
        FROM "vocabflow_app"."review_events"
        WHERE vocabulary_id IN (1, 295)
        GROUP BY vocabulary_id
        ORDER BY vocabulary_id
      `;
      const [appleOverlapRow] = await tx<JsonRecord[]>`
        SELECT count(*)::int AS overlapping_learner_count
        FROM "vocabflow_app"."learner_progress" p1
        JOIN "vocabflow_app"."learner_progress" p2 ON p2.learner_id = p1.learner_id
        WHERE p1.vocabulary_id = 1 AND p2.vocabulary_id = 295
      `;
      const assignmentCounts = new Map(assignmentRows.map((row) => [asNumber(row.learning_set_id), {
        assignmentCount: asNumber(row.learner_assignment_count),
        activeAssignmentCount: asNumber(row.active_learner_assignment_count),
      }]));
      const appleSetIds = [...new Set(appleLearningSetRows.map((row) => asNumber(row.learning_set_id)))];
      const appleIdentityAudit: AppleIdentityAudit = {
        vocabularyIds: [1, 295],
        learningSetMemberships: appleLearningSetRows.map((row) => ({
          vocabularyId: asNumber(row.vocabulary_id), learningSetId: asNumber(row.learning_set_id),
          slug: asString(row.slug), name: asString(row.name), enabled: row.enabled === true, sortOrder: asNumber(row.sort_order),
        })),
        normalizedTopicMemberships: appleTopicRows.map((row) => ({
          vocabularyId: asNumber(row.vocabulary_id), topicId: asNumber(row.topic_id),
          slug: asString(row.slug), name: asString(row.name), enabled: row.enabled === true,
        })),
        progressStateCounts: appleProgressRows.map((row) => ({
          vocabularyId: asNumber(row.vocabulary_id), status: asString(row.status), count: asNumber(row.row_count),
        })),
        reviewSummary: appleReviewRows.map((row) => ({
          vocabularyId: asNumber(row.vocabulary_id), count: asNumber(row.row_count),
          earliest: asNullableString(row.earliest_review), latest: asNullableString(row.latest_review),
        })),
        overlappingLearnerCount: asNumber(appleOverlapRow?.overlapping_learner_count),
        learningSetAssignmentCounts: appleSetIds.map((learningSetId) => ({
          learningSetId,
          assignmentCount: assignmentCounts.get(learningSetId)?.assignmentCount ?? 0,
          activeAssignmentCount: assignmentCounts.get(learningSetId)?.activeAssignmentCount ?? 0,
        })),
        technologyStarterExactCollisions: learningSetRows.flatMap((row) => {
          const slug = asString(row.slug);
          const name = asString(row.name);
          return slug === "technology-starter" || name.toLocaleLowerCase("en-US") === "technology starter"
            ? [{ learningSetId: asNumber(row.id), slug, name }]
            : [];
        }),
        runtimeLearningSetCount: learningSetRows.length,
      };

      return {
        vocabularies: vocabRows.map(mapVocabulary),
        vocabularyMappings: mappingRows.map((row) => ({
          masterSenseId: asString(row.master_sense_id), masterLexemeId: asString(row.master_lexeme_id),
          vocabularyId: asNumber(row.vocabulary_id), projectionContractVersion: asString(row.projection_contract_version),
          appliedProjectionFingerprint: asString(row.applied_projection_fingerprint), lastReleaseHash: asString(row.last_release_hash),
        })),
        topics: [],
        topicMappings: [],
        learningSets: learningSetRows.map((row) => ({
          id: asNumber(row.id), slug: asString(row.slug), name: asString(row.name), description: asString(row.description),
          grade: asNullableString(row.grade), enabled: row.enabled === true, sortOrder: asNumber(row.sort_order),
        })),
        learningSetMappings: learningSetMappingRows.map((row) => ({
          masterLearningSetId: asString(row.master_learning_set_id), learningSetId: asNumber(row.learning_set_id),
        })),
        vocabularyTopics: [],
        masterVocabularyTopicMemberships: [],
        learningSetItems: learningSetItemRows.map((row) => ({
          learningSetId: asNumber(row.learning_set_id), vocabularyId: asNumber(row.vocabulary_id), sortOrder: asNumber(row.sort_order),
        })),
        masterLearningSetMemberships: learningSetMembershipRows.map((row) => ({
          masterLearningSetItemId: asString(row.master_learning_set_item_id), masterLearningSetId: asString(row.master_learning_set_id),
          masterSenseId: asString(row.master_sense_id), learningSetId: asNumber(row.learning_set_id),
          vocabularyId: asNumber(row.vocabulary_id), sortOrder: asNumber(row.sort_order),
        })),
        progressVocabularyIds: [],
        reviewVocabularyIds: [],
        appliedRuns: appliedRunRows.map((row) => ({
          datasetId: asString(row.dataset_id), releaseHash: asString(row.release_hash),
          appImportContractVersion: asString(row.app_import_contract_version), projectionContractVersion: asString(row.projection_contract_version),
          reconciliationHash: asString(row.reconciliation_hash), planFingerprint: asString(row.plan_fingerprint),
        })),
        learningSetAssignmentCounts: assignmentRows.map((row) => ({
          learningSetId: asNumber(row.learning_set_id), learnerAssignmentCount: asNumber(row.learner_assignment_count),
          activeLearnerAssignmentCount: asNumber(row.active_learner_assignment_count),
        })),
        learnerProgressCounts: progressRows.map((row) => ({ vocabularyId: asNumber(row.vocabulary_id), referenceCount: asNumber(row.reference_count) })),
        reviewEventCounts: reviewRows.map((row) => ({ vocabularyId: asNumber(row.vocabulary_id), referenceCount: asNumber(row.reference_count) })),
        appleIdentityAudit,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function sanitizeUrl(value: unknown): { value: unknown; redacted: boolean } {
  if (typeof value !== "string" || value.length === 0) return { value, redacted: false };
  try {
    const parsed = new URL(value);
    let redacted = false;
    if (parsed.username || parsed.password) {
      parsed.username = "";
      parsed.password = "";
      redacted = true;
    }
    for (const [key] of parsed.searchParams) {
      if (/(?:token|secret|signature|credential|password|api[_-]?key|auth)/i.test(key)) {
        parsed.searchParams.set(key, "[REDACTED]");
        redacted = true;
      }
    }
    return { value: redacted ? parsed.toString() : value, redacted };
  } catch {
    return { value: "[INVALID_URL_REDACTED]", redacted: true };
  }
}

function sanitizeCandidateArtifact(value: JsonRecord): { artifact: JsonRecord; redactedUrlCount: number } {
  let redactedUrlCount = 0;
  const senses = asRecords(value.senses).map((sense) => ({
    ...sense,
    runtimeCandidates: asRecords(sense.runtimeCandidates).map((candidate) => {
      const next = { ...candidate };
      let candidateUrlRedacted = false;
      for (const key of ["imageUrl", "effectiveImageUrl", "audioUrl"]) {
        const sanitized = sanitizeUrl(next[key]);
        next[key] = sanitized.value;
        if (sanitized.redacted) {
          redactedUrlCount += 1;
          candidateUrlRedacted = true;
        }
      }
      const differences = asRecords(next.projectionDifferences).map((difference) => {
        if (difference.field !== "imageUrl" && difference.field !== "audioUrl") return difference;
        const sanitized = sanitizeUrl(difference.runtime);
        if (sanitized.redacted) {
          redactedUrlCount += 1;
          candidateUrlRedacted = true;
        }
        return { ...difference, runtime: sanitized.value };
      });
      next.projectionDifferences = differences;
      if (candidateUrlRedacted) next.runtimeUrlValuesRedacted = true;
      return next;
    }),
  }));
  return { artifact: { ...value, senses }, redactedUrlCount };
}

function escapeMarkdown(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function formatDifferences(candidate: JsonRecord): string {
  const rows = asRecords(candidate.projectionDifferences);
  return rows.length === 0 ? "none (exact effective projection)" : rows
    .map((row) => `${String(row.field)}: Master=${JSON.stringify(row.master)}, runtime=${JSON.stringify(row.runtime)}`)
    .join("; ");
}

function renderReport(input: {
  scannedAt: string;
  target: ReturnType<typeof getConnectionTarget>;
  migration: MigrationCheck;
  releaseHash: string;
  scan: JsonRecord;
  fingerprint: string;
  redactedUrlCount: number;
  plan: ReturnType<typeof buildMasterVocabularyImportPlan>;
}): string {
  const senses = asRecords(input.scan.senses);
  const learningSets = asRecords(input.scan.learningSets);
  const allCandidates = senses.flatMap((sense) => asRecords(sense.runtimeCandidates));
  const labels = ["EXACT_EFFECTIVE_MATCH", "PARTIAL_MATCH", "SEMANTIC_CANDIDATE", "CONFLICTING_MEANING"] as const;
  const labelCounts = Object.fromEntries(labels.map((label) => [label, allCandidates.filter((row) => row.candidateClassification === label).length]));
  const ambiguousCount = allCandidates.filter((row) => asStrings(row.reconciliationFlags).includes("AMBIGUOUS_RUNTIME_IDENTITY")).length;
  const overrideConflicts = allCandidates.filter((row) => row.vietnameseOverrideStatus === "CONFLICTS_WITH_MASTER").length;
  const quarantineCounts = {
    false: allCandidates.filter((row) => row.imageQuarantineStatus === "FALSE").length,
    trueNoMasterImage: allCandidates.filter((row) => row.imageQuarantineStatus === "TRUE_NO_MASTER_IMAGE").length,
    trueConflict: allCandidates.filter((row) => row.imageQuarantineStatus === "TRUE_CONFLICT").length,
  };
  const migrationLines = input.migration.requiredMigrations.map((row) =>
    `| ${row.tag} | ${row.applied ? "YES" : "NO"} | ${row.expectedHash ?? "—"} | ${row.appliedHash ?? "—"} |`).join("\n");
  const senseLines = senses.map((sense) => {
    const projection = (sense.masterProjection ?? {}) as JsonRecord;
    const candidates = asRecords(sense.runtimeCandidates);
    const meanings = `${escapeMarkdown(projection.vietnamese)} — ${escapeMarkdown(projection.definitionEn)}`;
    const candidateSummary = candidates.length === 0 ? "No runtime candidate found" : candidates.map((candidate) =>
      `#${candidate.appVocabularyId} ${escapeMarkdown(candidate.word)} (${candidate.candidateClassification}; ${candidate.firstAdoptionAnalysis})`,
    ).join("<br>");
    const diffs = candidates.length === 0 ? "—" : candidates.map((candidate) =>
      `#${candidate.appVocabularyId}: ${escapeMarkdown(formatDifferences(candidate))}`,
    ).join("<br>");
    const history = candidates.length === 0 ? "—" : candidates.map((candidate) =>
      `#${candidate.appVocabularyId}: progress ${candidate.learnerProgressCount}, reviews ${candidate.reviewEventCount}`,
    ).join("<br>");
    const overrides = candidates.length === 0 ? "—" : candidates.map((candidate) =>
      `#${candidate.appVocabularyId}: ${candidate.vietnameseOverrideStatus}`,
    ).join("<br>");
    const quarantine = candidates.length === 0 ? "—" : candidates.map((candidate) =>
      `#${candidate.appVocabularyId}: ${candidate.imageQuarantineStatus}`,
    ).join("<br>");
    const decisions = candidates.length === 0 ? "UNRESOLVED (no candidate)" : candidates.map((candidate) =>
      `#${candidate.appVocabularyId}: ${candidate.decision}${asStrings(candidate.reconciliationFlags).length ? `; flags ${JSON.stringify(candidate.reconciliationFlags)}` : ""}`,
    ).join("<br>");
    return `| ${escapeMarkdown(sense.lemma)} — ${meanings} | ${candidateSummary} | ${diffs} | ${history} | ${overrides} | ${quarantine} | ${decisions} |`;
  }).join("\n");
  const setLines = learningSets.map((row) => {
    const candidates = asRecords(row.runtimeCandidates);
    return candidates.length === 0 ? `- No matching runtime Learning Set candidate among ${row.runtimeLearningSetCount} inspected rows; decision remains UNRESOLVED.` : candidates.map((candidate) =>
      `- Candidate app set #${candidate.appLearningSetId}: slug \`${candidate.slug}\`, name “${candidate.name}”, enabled=${candidate.enabled}, sortOrder=${candidate.sortOrder}; assignments=${candidate.learnerAssignmentCount}, active assignments=${candidate.activeLearnerAssignmentCount}; memberships=${JSON.stringify(candidate.memberships)}; existing Master memberships=${JSON.stringify(candidate.masterMemberships)}; existing Master mapping=${JSON.stringify(candidate.existingMasterLearningSetMapping)}; decision=${candidate.decision}.`,
    ).join("\n");
  }).join("\n");
  const decisionTemplate = senses.map((sense) => `### ${sense.lemma} — ${sense.masterSenseId}\n\nDecision:\n[ ] MAP_EXISTING\n[ ] CREATE_NEW\n[ ] SKIP\n\nIf MAP_EXISTING:\nappVocabularyId = ___\n\nfirstAdoptionPolicy:\n[ ] ADOPT_EXISTING_AS_BASELINE\n[ ] UPDATE_TO_MASTER\n\nvietnameseOverridePolicy = ___\nimageQuarantinePolicy = ___\n\nCurrent decision: UNRESOLVED.`).join("\n\n");
  const setDecisionTemplate = learningSets.map((row) => `Technology Starter — ${row.masterLearningSetId}\n\n[ ] MAP_EXISTING\n[ ] CREATE_NEW\n[ ] SKIP\n\nCurrent decision: UNRESOLVED.`).join("\n\n");
  const topicCount = input.plan.topics.length;
  const topicSummary = topicCount === 0
    ? "Topic reconciliation is `NOT_REQUIRED_FOR_THIS_CANARY`; Master runtime topic projection is null."
    : `Unexpected topic actions were present (${topicCount}); inspect the planner output.`;
  return `# Development Runtime Reconciliation Scan — Master V2 Canary 2.1.0\n\nScanned: ${input.scannedAt}\n\n## Target verification\n\n- Environment/provider: \`${input.target.environment} / ${input.target.provider}\`\n- Neon project/branch: \`${input.target.projectId} / ${input.target.branchId}\`\n- Database: \`${input.target.databaseName}\`\n- Runtime role/purpose: \`${input.target.roleName} / ${input.target.purpose}\`\n- Pre-connect Neon branch/connection verification: PASS\n- Post-connect protected identity, database, and role verification: PASS\n- Snapshot transaction: \`REPEATABLE READ, READ ONLY\`\n- Migration inspection role: \`vocabflow_migration\` (same verified development project/branch/database)\n\n## Migration state\n\nCurrent: **${input.migration.current ? "YES" : "NO"}** (${input.migration.requiredMigrations.filter((row) => row.applied).length}/3 required migrations 0015–0017 matched; ${input.migration.appliedCount}/${input.migration.localMigrationCount} migration journal rows present). Latest applied: \`${input.migration.latestApplied?.tag ?? "none"}\`.\n\n| Migration | Applied and hash matched | Expected local hash | Database hash |\n| --- | --- | --- | --- |\n${migrationLines}\n\nLocal journal rows present: ${input.migration.appliedCount}/${input.migration.localMigrationCount}; missing rows: ${input.migration.missingJournalRows.length}. Local migration file hash differences: ${input.migration.historicalHashMismatches.map((row) => row.tag).join(", ") || "none"}.\n\n## Approved release\n\n- Version/schema/status: \`2.1.0 / 2.0.1 / APPROVED\`\n- Release hash: \`${input.releaseHash}\`\n- RELEASE transform: \`8/8 projected; importEligible=true\`\n- Topics/taxonomy: 0/0. ${topicSummary}\n- Reconciliation dry-run: reconciliationComplete=${input.plan.eligibility.reconciliationComplete}; canApply=${input.plan.eligibility.canApply}. (No APPLY path was invoked.)\n\n## Snapshot fingerprint\n\n- Algorithm: SHA-256 over canonical JSON (RFC 8785/JCS).\n- Fingerprint: \`${input.fingerprint}\`\n- Included: development project/branch/database and role/purpose, release hash, applied migration tags/hashes, the full vocabulary discovery universe (learner-facing content, overrides/quarantine, enabled/contentVersion/source identity), candidate IDs per Master Sense, relevant Master mappings/fingerprints/contracts/releases, candidate progress/review reference counts, all Learning Set discovery fields, candidate memberships/assignment counts/mappings, and applied import-run identities.\n- Excluded: scan time, database timestamps, learner IDs, and learner-level row content. History contributes aggregate counts per candidate vocabulary ID and candidate set.\n\n## Candidate summary\n\n- Master Senses scanned: ${senses.length}\n- Runtime candidate rows: ${allCandidates.length}\n- Candidate classifications: ${labels.map((label) => `${label} ${labelCounts[label]}`).join("; ")}\n- Ambiguous runtime identity candidate rows: ${ambiguousCount}\n- Conflicting Vietnamese overrides: ${overrideConflicts}\n- Image quarantine counts among candidates: FALSE ${quarantineCounts.false}; TRUE_NO_MASTER_IMAGE ${quarantineCounts.trueNoMasterImage}; TRUE_CONFLICT ${quarantineCounts.trueConflict}\n- Sensitive URL values redacted before artifact output: ${input.redactedUrlCount}\n\n| Master Sense / meaning | Runtime candidates | Field-level diff (Master → runtime effective) | History counts | Vietnamese override | Image quarantine | Final decision |\n| --- | --- | --- | --- | --- | --- | --- |\n${senseLines}\n\n## Technology Starter candidates\n\n${setLines || "- No runtime candidate found; decision remains `UNRESOLVED`."}\n\nNo runtime set mapping, membership, or learner assignment was changed.\n\n## Owner decision template\n\n${decisionTemplate}\n\n${setDecisionTemplate}\n\nNo MAP_EXISTING, CREATE_NEW, or SKIP decision has been selected. No first-adoption policy has been set.\n\n## Safety boundary\n\nThis was a read-only evidence scan. No migration/import apply, INSERT, UPDATE, DELETE, runtime ID allocation, bridge mapping creation, learner-history mutation, set assignment, media operation, shared-CI connection, or production connection was performed. Candidate similarity is discovery evidence only.\n`;
}

function safeTarget(target: ReturnType<typeof getConnectionTarget>) {
  return {
    environment: target.environment,
    provider: target.provider,
    projectId: target.projectId,
    branchId: target.branchId,
    databaseName: target.databaseName,
    pooled: target.pooled,
    usage: target.usage,
    identityVersion: target.identityVersion,
    purpose: target.purpose,
    roleName: target.roleName,
  };
}

async function main() {
  loadRepositoryEnv();
  const repositoryRoot = process.cwd();
  const datasetRoot = path.resolve(repositoryRoot, RELEASE_RELATIVE_ROOT);
  const release = parseRelease(datasetRoot);
  const { context, environment } = readContext();
  if (context !== "local-development" || environment !== "development") throw new Error("DEVELOPMENT_SCAN_LOCAL_CONTEXT_REQUIRED");
  const targetName = resolveCurationTargetName(context, "development");
  if (targetName !== "development") throw new Error("DEVELOPMENT_SCAN_TARGET_MISMATCH");
  const source: TrustedSource = "dev-launcher";
  const runtimeTarget = configuredCurationTarget("development");
  const migrationTarget = getConnectionTarget("development", "migration");
  const authorized = assertCurationDatabaseAccess({
    executionContext: context,
    trustedSource: source,
    vocabularyEnvironment: environment,
    databaseEnvironment: process.env.DATABASE_ENV,
    requestedTarget: "development",
    resolvedTarget: runtimeTarget,
    mode: "dry-run",
  });
  if (authorized.branchId !== "br-square-grass-b3af0nte" || runtimeTarget.projectId !== "shy-hill-72364426"
    || runtimeTarget.databaseName !== "neondb" || runtimeTarget.environment !== "development"
    || runtimeTarget.usage === "shared-ci") throw new Error("DEVELOPMENT_SCAN_TARGET_MISMATCH");

  // Verify provider-selected branch/DB/role for both explicit purposes before opening either connection.
  const runtimeConnection = await assertResolvedTargetBeforeMutation({
    context, source, environment, purpose: "runtime", operation: "db-check", target: runtimeTarget,
  });
  const migrationConnection = await assertResolvedTargetBeforeMutation({
    context, source, environment, purpose: "migration", operation: "db-check", target: migrationTarget,
  });

  const journalEntries = readJournalEntries();
  const localMigrations = readMigrationHashEvidence(path.join(repositoryRoot, "drizzle/migrations"));
  const localHashes = new Map<number, MigrationHashEvidence>();
  for (const migration of localMigrations) localHashes.set(migration.folderMillis, migration);
  if (localMigrations.length !== journalEntries.length || journalEntries.some((entry) => !localHashes.has(entry.when))) {
    throw new Error("LOCAL_MIGRATION_JOURNAL_MISMATCH");
  }

  const migration = await readDevelopmentMigrationState({
    url: migrationConnection.url,
    target: migrationTarget,
    entries: journalEntries,
    localHashes,
  });
  const scannedAt = new Date().toISOString();
  const reportPath = path.join(repositoryRoot, REPORT_RELATIVE_PATH);
  if (!migration.current) {
    mkdirSync(path.dirname(reportPath), { recursive: true });
    const missing = migration.missingMigrations.map((tag) => `- ${tag}`).join("\n") || "- No missing tag detected; applied history still differs from the local migration chain.";
    const required = migration.requiredMigrations.map((row) => `| ${row.tag} | ${row.applied ? "YES" : "NO"} | ${row.expectedHash ?? "—"} | ${row.appliedHash ?? "—"} |`).join("\n");
    const hashDrift = migration.historicalHashMismatches.map((row) => row.tag).join(", ") || "none";
    writeFileSync(reportPath, `# Development Runtime Reconciliation Scan — Blocked\n\nScanned: ${scannedAt}\n\nDevelopment target project/branch/database were provider-verified. Migration history was read using the verified \`vocabflow_migration\` role in a \`REPEATABLE READ, READ ONLY\` transaction. The actual DB history does not match the complete local migration chain, so the catalog scan was stopped before reconciliation planning.\n\n- Applied/local migrations: ${migration.appliedCount}/${migration.localMigrationCount}\n- Latest DB migration: ${migration.latestApplied?.tag ?? "none"}\n- Required migration hashes (0015–0017):\n| Migration | Matched | Expected local hash | Database hash |\n| --- | --- | --- | --- |\n${required}\n\n- Missing/mismatched journal migrations: ${missing}\n- Missing journal rows: ${migration.missingJournalRows.join(", ") || "none"}\n- Local hash drift: ${hashDrift}\n\nNo runtime catalog query, reconciliation candidate artifact, planner, or database mutation was performed.\n`, "utf8");
    process.stdout.write(`DEVELOPMENT_TARGET_VERIFIED=YES\nDEVELOPMENT_MIGRATIONS_CURRENT=NO\nRUNTIME_SNAPSHOT_READY=NO\nVOCABULARY_CANDIDATES_READY=NO\nLEARNING_SET_CANDIDATES_READY=NO\nRUNTIME_RECONCILIATION_READY=NO\nIMPORT_PLAN_CAN_APPLY=NO\nPHASE_2E_OWNER_RECONCILIATION_READY=NO\nMISSING_MIGRATIONS=${JSON.stringify(migration.missingMigrations)}\nREPORT=${REPORT_RELATIVE_PATH}\n`);
    return;
  }

  const snapshot = await readDevelopmentRuntimeSnapshot({ url: runtimeConnection.url, target: runtimeTarget });
  const scan = scanMasterVocabularyV2ReadOnlySnapshot({ snapshot, senses: release.masters, learningSets: release.learningSets });
  const fingerprint = fingerprintDevelopmentReconciliationSnapshot({
    target: safeTarget(runtimeTarget),
    releaseHash: release.releaseHash,
    snapshot,
    scan,
    appliedMigrations: migration.appliedMigrationsForFingerprint,
  });
  const plan = buildMasterVocabularyImportPlan({
    artifacts: release.artifacts,
    reconciliation: release.reconciliationTemplate as never,
    snapshot,
    targetEnvironment: "development",
    mode: "DRY_RUN",
  });
  if (plan.eligibility.reconciliationComplete || plan.eligibility.canApply) throw new Error("UNRESOLVED_RECONCILIATION_PLAN_GATE_INVALID");

  const candidatePath = path.join(datasetRoot, CANDIDATE_RELATIVE_PATH);
  if (existsSync(candidatePath)) {
    const existing = readJsonFile<JsonRecord>(candidatePath);
    if (existing.generatedByScan !== true || existing.owner === "human-reviewed") {
      throw new Error("REFUSING_TO_OVERWRITE_NON_GENERATED_RECONCILIATION_ARTIFACT");
    }
  }
  const baseCandidateArtifact: JsonRecord = {
    artifactVersion: "runtime-reconciliation-candidates-development-v2",
    owner: "analysis-only",
    generatedByScan: true,
    analysisOnly: true,
    readOnlySnapshotOnly: true,
    sourceDatasetVersion: "2.1.0",
    sourceSchemaVersion: "2.0.1",
    sourceReleaseHash: release.releaseHash,
    target: safeTarget(runtimeTarget),
    migrationState: migration,
    scannedAt,
    snapshotFingerprint: fingerprint,
    snapshotFingerprintAlgorithm: "sha256-canonical-json-v1",
    snapshotFingerprintContract: "Includes the complete runtime vocabulary and Learning Set discovery universes, candidate search results, relevant Master mappings, candidate history counts and memberships/assignments, apple progress states/review ranges/learner-overlap count, applied run identities, verified target identity, release hash and applied migration hashes. Excludes learner IDs.",
    plannerSnapshotFingerprint: plan.snapshotFingerprint,
    appleIdentityAudit: snapshot.appleIdentityAudit,
    plannerDryRun: {
      mode: plan.mode,
      reconciliationComplete: plan.eligibility.reconciliationComplete,
      canApply: plan.eligibility.canApply,
      unresolvedSenses: plan.reconciliation.vocabularyUnresolved,
      unresolvedTopics: plan.reconciliation.topicsUnresolved,
      unresolvedLearningSets: plan.reconciliation.learningSetsUnresolved,
      issueCodes: [...new Set(plan.issues.map((issue) => issue.code))].sort(),
    },
    ...scan,
  };
  const sanitized = sanitizeCandidateArtifact(baseCandidateArtifact);
  sanitized.artifact.redactedSensitiveUrlCount = sanitized.redactedUrlCount;
  sanitized.artifact.decisionsRemainUnresolved = asRecords(sanitized.artifact.senses).every((row) => row.decision === "UNRESOLVED")
    && asRecords(sanitized.artifact.learningSets).every((row) => row.decision === "UNRESOLVED");
  if (sanitized.artifact.decisionsRemainUnresolved !== true) throw new Error("RECONCILIATION_DECISION_WAS_NOT_UNRESOLVED");

  mkdirSync(path.dirname(candidatePath), { recursive: true });
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(candidatePath, `${JSON.stringify(sanitized.artifact, null, 2)}\n`, "utf8");
  let report = renderReport({
    scannedAt,
    target: runtimeTarget,
    migration,
    releaseHash: release.releaseHash,
    scan: sanitized.artifact,
    fingerprint,
    redactedUrlCount: sanitized.redactedUrlCount,
    plan,
  });
  const migrationDriftTable = migration.historicalHashMismatches.length === 0
    ? "No historical migration hash differences were found."
    : [
      "### Historical migration hash differences",
      "",
      "| Migration | Canonical local SHA-256 | Database SHA-256 |",
      "| --- | --- | --- |",
      ...migration.historicalHashMismatches.map((row) => `| ${row.tag} | ${row.expectedHash} | ${row.appliedHash} |`),
      "",
    ].join("\n");
  const migrationHashMatrix = [
    "## Migration hash representation matrix",
    "",
    "| Migration | Database SHA-256 | Worktree raw SHA-256 | LF SHA-256 | CRLF SHA-256 | CR SHA-256 | DB representation |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...migration.hashComparisons.map((row) => `| ${row.tag} | ${row.databaseHash ?? "—"} | ${row.worktreeRawHash ?? "—"} | ${row.lfHash ?? "—"} | ${row.crlfHash ?? "—"} | ${row.crHash ?? "—"} | ${row.matchedRepresentation ?? "NO_DB_ROW"} |`),
    "",
  ].join("\n");
  report = report.replace("\n## Approved release\n", `\n${migrationDriftTable}\n\n${migrationHashMatrix}\n## Approved release\n`);
  report = report.replace(
    "\n## Candidate summary\n",
    `\n- Full planner snapshot fingerprint (canonical JSON of the complete runtime snapshot): \`${plan.snapshotFingerprint}\`\n\n## Candidate summary\n`,
  );
  if (!report.includes(`Full planner snapshot fingerprint (canonical JSON of the complete runtime snapshot): \`${plan.snapshotFingerprint}\``)) {
    throw new Error("RECONCILIATION_REPORT_FINGERPRINT_INSERT_FAILED");
  }
  writeFileSync(reportPath, report, "utf8");
  const proposalPath = path.join(datasetRoot, OWNER_PROPOSAL_RELATIVE_PATH);
  if (existsSync(proposalPath)) {
    const existing = readJsonFile<JsonRecord>(proposalPath);
    if (existing.analysisOnly !== true || existing.owner === "human-reviewed") {
      throw new Error("REFUSING_TO_OVERWRITE_NON_ANALYSIS_OWNER_PROPOSAL");
    }
  }
  const proposal = buildOwnerReconciliationProposal({
    candidateArtifact: sanitized.artifact,
    appleIdentityAudit: snapshot.appleIdentityAudit as AppleIdentityAudit,
    scannedAt,
  });
  if (!proposalHasOnlyUnresolvedOwnerDecisions(proposal)) throw new Error("OWNER_PROPOSAL_CONTAINS_FINAL_DECISION");
  mkdirSync(path.dirname(proposalPath), { recursive: true });
  writeFileSync(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`, "utf8");
  const ownerReviewPath = path.join(repositoryRoot, OWNER_REVIEW_RELATIVE_PATH);
  mkdirSync(path.dirname(ownerReviewPath), { recursive: true });
  writeFileSync(ownerReviewPath, renderOwnerReconciliationReview(proposal), "utf8");
  process.stdout.write(`DEVELOPMENT_TARGET_VERIFIED=YES\nDEVELOPMENT_MIGRATIONS_CURRENT=YES\nRUNTIME_SNAPSHOT_READY=YES\nVOCABULARY_CANDIDATES_READY=${asRecords(sanitized.artifact.senses).length === 8 ? "YES" : "NO"}\nLEARNING_SET_CANDIDATES_READY=${asRecords(sanitized.artifact.learningSets).length === 1 ? "YES" : "NO"}\nAPPLE_IDENTITY_AUDIT_READY=YES\nRUNTIME_RECONCILIATION_READY=NO\nIMPORT_PLAN_CAN_APPLY=NO\nPHASE_2E_OWNER_RECONCILIATION_READY=YES\nSENSE_CANDIDATE_COUNT=${asRecords(sanitized.artifact.senses).length}\nCANDIDATE_ROW_COUNT=${asRecords(sanitized.artifact.senses).reduce((sum, sense) => sum + asRecords(sense.runtimeCandidates).length, 0)}\nSNAPSHOT_FINGERPRINT=${fingerprint}\nRECONCILIATION_COMPLETE=${plan.eligibility.reconciliationComplete}\nCAN_APPLY=${plan.eligibility.canApply}\nCANDIDATE_ARTIFACT=${path.relative(repositoryRoot, candidatePath)}\nOWNER_PROPOSAL_ARTIFACT=${path.relative(repositoryRoot, proposalPath)}\nOWNER_REVIEW_REPORT=${path.relative(repositoryRoot, ownerReviewPath)}\nREPORT=${path.relative(repositoryRoot, reportPath)}\n`);
}

function isMain() {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    process.stderr.write(`${/^[A-Z][A-Z0-9_:.-]{2,120}$/.test(message) ? message : "DEVELOPMENT_RECONCILIATION_SCAN_FAILED"}\n`);
    process.exitCode = 1;
  });
}
