import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = process.cwd();
const TARGET = Object.freeze({
  projectId: "silent-sky-84582895",
  branchId: "br-cold-shadow-a17yg4k2",
  endpointId: "ep-ancient-tree-a15xogc1",
  database: "neondb",
  appSchema: "vocabflow_app",
});
const SOURCE_DATABASE = "vocabflow_dev";
const EXPECTED_SENSES = 7311;
const EXPECTED_METADATA_SHA256 = "84a4fa877bb949c2f4c9b3e04d2530f9911ae28d74d19f9820b3bf322dc580ec";
const MIGRATION_SEED_SET_SLUGS = ["starter-vocabulary", "grade-1-starter", "family-basics", "school-basics", "everyday-words"];
const MIGRATION_SEED_TOPIC_CODES = [
  "Action", "body", "casual", "Challenge", "Clothing", "CommonPlace", "Communication",
  "Computer_office_science", "Emotion", "Family", "Food", "Healthy", "Miscellaneous",
  "nature", "ObjectInHouse", "Photography", "writing_number",
];
const WORKSPACE = "vocabflow-dataset/workspaces/master-v2-development-sync";
const SNAPSHOT_PATH = ".vocabflow-local/master-v2-local-docker-snapshot-v1.json";
const AUTHORING_SNAPSHOT_PATH = path.join(WORKSPACE, "development-runtime-v1/master-v2-development-runtime-snapshot-v1.json");
const QUEUE_PATH = path.join(WORKSPACE, "independent-content-review-queue-v1.json");
const CANDIDATE_PATH = path.join(WORKSPACE, "master-v2-release-candidate-v9.json");
const METADATA_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-v1.json");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readEnvFile(file) {
  const source = readFileSync(file, "utf8");
  const result = {};
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

function readPinnedJson(file) {
  const bytes = readFileSync(file);
  return { bytes, value: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

async function verifyNeonTarget(env, targetUrl) {
  assert(env.NEON_API_KEY && env.NEON_V2_PROJECT_ID === TARGET.projectId
    && env.NEON_V2_BRANCH_ID === TARGET.branchId, "NEON_TARGET_SECRET_METADATA_MISMATCH");
  const headers = { Authorization: "Bearer " + env.NEON_API_KEY };
  const responses = await Promise.all([
    fetch("https://console.neon.tech/api/v2/projects/" + TARGET.projectId, { headers }),
    fetch("https://console.neon.tech/api/v2/projects/" + TARGET.projectId + "/branches/" + TARGET.branchId, { headers }),
    fetch("https://console.neon.tech/api/v2/projects/" + TARGET.projectId + "/endpoints", { headers }),
  ]);
  assert(responses.every((response) => response.ok), "NEON_TARGET_API_PREFLIGHT_FAILED");
  const [projectBody, branchBody, endpointBody] = await Promise.all(responses.map((response) => response.json()));
  const endpoint = (endpointBody.endpoints ?? []).find((row) => row.id === TARGET.endpointId);
  assert(projectBody.project?.id === TARGET.projectId && projectBody.project?.name === "vocabflow-v2"
    && branchBody.branch?.id === TARGET.branchId && branchBody.branch?.project_id === TARGET.projectId
    && branchBody.branch?.name === "dev" && branchBody.branch?.primary === false
    && endpoint?.branch_id === TARGET.branchId && endpoint?.type === "read_write",
  "NEON_DEVELOPMENT_TARGET_MISMATCH");
  const parsed = new URL(targetUrl);
  assert(parsed.hostname === TARGET.endpointId + ".ap-southeast-1.aws.neon.tech"
    && decodeURIComponent(parsed.pathname.replace(/^\//u, "")) === TARGET.database
    && decodeURIComponent(parsed.username) === "vocabflow_migration"
    && !parsed.hostname.includes("-pooler"), "NEON_CONNECTION_TARGET_MISMATCH");
}

function validateReviewArtifacts(sourceRows, snapshotFile, authoringSnapshotFile, queueFile, candidateFile, metadataFile) {
  const snapshot = snapshotFile.value;
  const authoringSnapshot = authoringSnapshotFile.value;
  const queue = queueFile.value;
  const candidate = candidateFile.value;
  const metadata = metadataFile.value;
  assert(snapshot.includedSenseCount === EXPECTED_SENSES
    && snapshot.editorialStatus === "DRAFT" && snapshot.approvalGranted === false
    && snapshot.releaseEligible === false && snapshot.rightsStatus === "UNKNOWN_REVIEW_REQUIRED",
  "SOURCE_SNAPSHOT_SCOPE_OR_GATE_MISMATCH");
  assert(authoringSnapshot.includedSenseCount === EXPECTED_SENSES
    && authoringSnapshot.excludedNonPassCount === 9
    && authoringSnapshot.sourceQueueSha256 === queueFile.sha256
    && authoringSnapshot.releaseCandidateSha256 === candidateFile.sha256
    && authoringSnapshot.projectionFingerprint === snapshot.projectionFingerprint,
  "AUTHORING_SNAPSHOT_PIN_MISMATCH");
  assert(queue.entries?.length === 7320 && candidate.senseDispositions?.length === 7320
    && candidate.senseDispositions.filter((row) => row.contentReviewDecision === "PASS").length === EXPECTED_SENSES
    && candidate.releaseApproved === false && candidate.runtimeImported === false
    && candidate.mediaIncluded === false && candidate.eligibleSenses?.length === 0
    && candidate.rightsClearedSenseCount === 0 && candidate.releaseEligibleSenseCount === 0,
  "CONTENT_REVIEW_CANDIDATE_GATE_MISMATCH");
  assert(metadata.artifactVersion === "1.0.0" && metadata.senses?.length === EXPECTED_SENSES
    && metadataFile.sha256 === EXPECTED_METADATA_SHA256, "LEARNING_METADATA_PIN_MISMATCH");

  const candidateByKey = new Map(candidate.senseDispositions.map((row) => [row.proposalKey, row]));
  const queueByKey = new Map(queue.entries.map((row) => [row.proposalKey, row]));
  const metadataByKey = new Map(metadata.senses.map((row) => [row.proposalKey, row]));
  const snapshotByKey = new Map(snapshot.identities.map((row) => [row.proposalKey, row.contentSha256]));
  const receiptCache = new Map();
  assert(candidateByKey.size === 7320 && queueByKey.size === 7320
    && metadataByKey.size === EXPECTED_SENSES && snapshotByKey.size === EXPECTED_SENSES,
  "SOURCE_IDENTITY_DUPLICATE");

  for (const row of sourceRows) {
    const disposition = candidateByKey.get(row.proposal_key);
    const queueEntry = queueByKey.get(row.proposal_key);
    const metadataSense = metadataByKey.get(row.proposal_key);
    assert(disposition && queueEntry && metadataSense
      && disposition.contentReviewDecision === "PASS"
      && disposition.identityAndSourceValid === true
      && disposition.versionSelectionResolved === true
      && disposition.effectiveContentHash === row.content_sha256
      && metadataSense.contentSha256 === row.content_sha256
      && snapshotByKey.get(row.proposal_key) === row.content_sha256
      && row.content_review_decision === "PASS"
      && row.editorial_status === "DRAFT"
      && row.rights_status === "UNKNOWN_REVIEW_REQUIRED"
      && /^[0-9a-f]{64}$/u.test(row.content_sha256),
    "SOURCE_SENSE_REVIEW_OR_HASH_GATE_MISMATCH");
    assert(disposition.reviewerIdentity === row.reviewer_identity
      && disposition.contentReviewReceipt === row.review_receipt_path,
    "SOURCE_REVIEWER_OR_RECEIPT_IDENTITY_MISMATCH");
    const receiptPath = path.resolve(ROOT, disposition.contentReviewReceipt);
    assert(receiptPath.startsWith(ROOT + path.sep), "REVIEW_RECEIPT_OUTSIDE_REPOSITORY");
    let cached = receiptCache.get(receiptPath);
    if (!cached) {
      const bytes = readFileSync(receiptPath);
      cached = { hash: sha256(bytes), receipt: JSON.parse(bytes.toString("utf8")) };
      receiptCache.set(receiptPath, cached);
    }
    assert(cached.hash === row.review_receipt_sha256
      && cached.receipt.reviewerIdentity === row.reviewer_identity
      && Array.isArray(cached.receipt.entries)
      && cached.receipt.entries.some((entry) => entry.proposalKey === row.proposal_key
        && (entry.effectiveContentHash === row.content_sha256 || entry.reviewedContentHash === row.content_sha256)
        && (entry.decision ?? entry.verdict ?? entry.disposition ?? entry.revisedDecision) === "PASS"),
    "CURRENT_PASS_RECEIPT_INVALID");
  }
  return { metadata, candidate, metadataByKey };
}

function metadataRows(metadata, vocabularyIds) {
  const topics = [...metadata.topics].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map((row, index) => ({
      id: index + 1, slug: row.slug, name: row.name, description: row.description,
      sort_order: row.sortOrder, enabled: true, source_topic: row.code,
    }));
  const topicIdByCode = new Map(metadata.topics.map((row, index) => [row.code, index + 1]));
  const learningSets = [...metadata.learningSets].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug))
    .map((row, index) => ({
      id: index + 1, slug: row.slug, name: row.name, description: row.description,
      grade: row.grade ?? null, enabled: true, sort_order: row.sortOrder,
    }));
  const learningSetIdBySlug = new Map(metadata.learningSets.map((row, index, rows) => {
    const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
    return [row.slug, sorted.findIndex((item) => item.slug === row.slug) + 1];
  }));
  const topicLinks = [];
  const learningLinks = [];
  for (const sense of metadata.senses) {
    const vocabularyId = vocabularyIds.get(sense.proposalKey);
    assert(Number.isInteger(vocabularyId), "METADATA_VOCABULARY_ID_MISSING");
    for (const topic of new Set((sense.topics ?? []).map((row) => row.code))) {
      const topicId = topicIdByCode.get(topic);
      assert(Number.isInteger(topicId), "METADATA_TOPIC_NOT_DEFINED");
      topicLinks.push({ vocabulary_id: vocabularyId, topic_id: topicId });
    }
    for (const slug of new Set((sense.learningSets ?? []).map((row) => row.slug))) {
      const learningSetId = learningSetIdBySlug.get(slug);
      assert(Number.isInteger(learningSetId), "METADATA_LEARNING_SET_NOT_DEFINED");
      learningLinks.push({ learning_set_id: learningSetId, vocabulary_id: vocabularyId,
        sort_order: learningLinks.filter((item) => item.learning_set_id === learningSetId).length });
    }
  }
  return { topics, learningSets, topicLinks, learningLinks };
}

const batchStatements = {
  vocabularies: {
    table: "vocabularies",
    columns: [
      ["id", "integer"], ["word", "text"], ["ipa", "text"], ["vietnamese", "text"],
      ["vietnamese_override", "text"], ["definition_en", "text"], ["example_en", "text"],
      ["image_url", "text"], ["image_quarantined", "boolean"], ["audio_url", "text"],
      ["topic", "text"], ["level", "vocabflow_app.vocabulary_level"], ["enabled", "boolean"],
      ["content_version", "integer"], ["source_dataset", "text"], ["source_record_id", "integer"],
      ["created_at", "timestamptz"], ["updated_at", "timestamptz"],
    ],
  },
  projections: {
    table: "master_v2_development_projections",
    columns: [
      ["proposal_key", "text"], ["source_group_key", "text"], ["vocabulary_id", "integer"],
      ["part_of_speech", "text"], ["cefr", "text"], ["tags", "jsonb"], ["examples", "jsonb"],
      ["usage_notes", "text"], ["source_provenance", "jsonb"], ["content_sha256", "text"],
      ["reviewer_identity", "text"], ["review_receipt_path", "text"], ["review_receipt_sha256", "text"],
      ["content_review_decision", "text"], ["editorial_status", "text"], ["rights_status", "text"],
      ["development_media", "jsonb"], ["created_at", "timestamptz"], ["updated_at", "timestamptz"],
    ],
  },
  topics: { table: "topics", columns: [["id", "integer"], ["slug", "text"], ["name", "text"], ["description", "text"], ["sort_order", "integer"], ["enabled", "boolean"], ["source_topic", "text"]] },
  learningSets: { table: "learning_sets", columns: [["id", "integer"], ["slug", "text"], ["name", "text"], ["description", "text"], ["grade", "vocabflow_app.vocabulary_level"], ["enabled", "boolean"], ["sort_order", "integer"]] },
  topicLinks: { table: "vocabulary_topics", columns: [["vocabulary_id", "integer"], ["topic_id", "integer"]] },
  learningLinks: { table: "learning_set_items", columns: [["learning_set_id", "integer"], ["vocabulary_id", "integer"], ["sort_order", "integer"]] },
  importRuns: { table: "master_v2_development_import_runs", columns: [["snapshot_fingerprint", "text"], ["source_queue_sha256", "text"], ["release_candidate_sha256", "text"], ["projection_fingerprint", "text"], ["imported_sense_count", "integer"], ["target_project_id", "text"], ["target_branch_id", "text"], ["target_database", "text"]] },
};

async function insertRows(tx, statement, rows) {
  const table = statement.table;
  const columns = statement.columns.map(([name]) => name);
  const definition = statement.columns.map(([name, type]) => name + " " + type).join(", ");
  const selected = columns.map((name) => "src." + name).join(", ");
  const query = "INSERT INTO vocabflow_app." + table + " (" + columns.join(", ") + ") "
    + "SELECT " + selected + " FROM jsonb_to_recordset($1::jsonb) AS src(" + definition + ") "
    + "ON CONFLICT DO NOTHING";
  let sentBytes = 0;
  let batches = 0;
  for (let offset = 0; offset < rows.length; offset += 250) {
    const payloadRows = rows.slice(offset, offset + 250);
    const payload = JSON.stringify(payloadRows);
    sentBytes += Buffer.byteLength(payload);
    batches += 1;
    await tx.unsafe(query, [tx.json(payloadRows)]);
  }
  return { rows: rows.length, batches, sentBytes };
}

async function main() {
  const sourceEnv = readEnvFile(".vocabflow-local/development.env");
  const targetEnv = readEnvFile(".vocabflow-local/neon-v2-development.env");
  const sourceUrl = sourceEnv.DATABASE_URL;
  const targetUrl = targetEnv.DATABASE_MIGRATION_URL;
  assert(sourceUrl && targetUrl, "DATABASE_URL_REQUIRED");
  const sourceParsed = new URL(sourceUrl);
  assert(sourceParsed.hostname === "127.0.0.1" && sourceParsed.port === "55432"
    && sourceParsed.pathname === "/" + SOURCE_DATABASE
    && decodeURIComponent(sourceParsed.username) === "vocabflow_runtime",
  "DOCKER_SOURCE_TARGET_MISMATCH");
  await verifyNeonTarget(targetEnv, targetUrl);

  const snapshotFile = readPinnedJson(SNAPSHOT_PATH);
  const authoringSnapshotFile = readPinnedJson(AUTHORING_SNAPSHOT_PATH);
  const queueFile = readPinnedJson(QUEUE_PATH);
  const candidateFile = readPinnedJson(CANDIDATE_PATH);
  const metadataFile = readPinnedJson(METADATA_PATH);
  const localSnapshotHash = "c50db6db6c4543ea7d9bd39f4f44cc89a36058c541fa5115315bb359b9b7e259";
  const authoringSnapshotHash = "c6043250522bfaeff546650a85b655e5809ea24ed739c2255e09e88612cc830c";
  assert(snapshotFile.sha256 === localSnapshotHash && authoringSnapshotFile.sha256 === authoringSnapshotHash,
    "DOCKER_SNAPSHOT_SHA256_MISMATCH");

  const source = postgres(sourceUrl, { max: 1, connect_timeout: 15, prepare: false });
  const target = postgres(targetUrl, { max: 1, connect_timeout: 15, ssl: "require", prepare: false });
  let inserted = false;
  try {
    const [sourceIdentity] = await source.unsafe("select current_database() as db, session_user as role, (select provider from vocabflow_meta.local_environment where database_name=current_database()) as provider from vocabflow_meta.local_environment where database_name=current_database()");
    assert(sourceIdentity?.db === SOURCE_DATABASE && sourceIdentity.role === "vocabflow_runtime"
      && sourceIdentity.provider === "docker-local", "DOCKER_SOURCE_IDENTITY_MISMATCH");
    const [sourceRun] = await source.unsafe("select snapshot_fingerprint, source_queue_sha256, release_candidate_sha256, projection_fingerprint, imported_sense_count, target_project_id, target_branch_id, target_database from vocabflow_app.master_v2_development_import_runs");
    assert(sourceRun?.imported_sense_count === EXPECTED_SENSES
      && sourceRun.snapshot_fingerprint === snapshotFile.value.snapshotFingerprint
      && sourceRun.projection_fingerprint === snapshotFile.value.projectionFingerprint
      && sourceRun.source_queue_sha256 === queueFile.sha256
      && sourceRun.release_candidate_sha256 === candidateFile.sha256,
    "DOCKER_IMPORT_RUN_PIN_MISMATCH");

    const sourceRows = await source.unsafe(
      "select p.proposal_key,p.source_group_key,p.vocabulary_id,p.part_of_speech,p.cefr,p.tags,p.examples,p.usage_notes,p.source_provenance,p.content_sha256,p.reviewer_identity,p.review_receipt_path,p.review_receipt_sha256,p.content_review_decision,p.editorial_status,p.rights_status,p.development_media,p.created_at,p.updated_at," +
      "v.word,v.ipa,v.vietnamese,v.vietnamese_override,v.definition_en,v.example_en,v.image_url,v.image_quarantined,v.audio_url,v.topic,v.level,v.enabled,v.content_version,v.source_dataset,v.source_record_id,v.created_at as vocabulary_created_at,v.updated_at as vocabulary_updated_at " +
      "from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id " +
      "where p.content_review_decision='PASS' and p.editorial_status='DRAFT' and p.rights_status='UNKNOWN_REVIEW_REQUIRED' " +
      "order by p.proposal_key"
    );
    assert(sourceRows.length === EXPECTED_SENSES, "DOCKER_V2_PASS_SOURCE_COUNT_MISMATCH");
    assert(new Set(sourceRows.map((row) => row.proposal_key)).size === EXPECTED_SENSES
      && new Set(sourceRows.map((row) => row.vocabulary_id)).size === EXPECTED_SENSES
      && new Set(sourceRows.map((row) => row.content_sha256)).size === EXPECTED_SENSES,
    "DOCKER_V2_SOURCE_IDENTITY_OR_HASH_DUPLICATE");
    const { metadata, metadataByKey } = validateReviewArtifacts(sourceRows, snapshotFile, authoringSnapshotFile, queueFile, candidateFile, metadataFile);
    const vocabularyIds = new Map(sourceRows.map((row) => [row.proposal_key, row.vocabulary_id]));
    const derived = metadataRows(metadata, vocabularyIds);
    assert(derived.topics.length === 21 && derived.learningSets.length === 10
      && derived.topicLinks.length === 1768 && derived.learningLinks.length === 5777,
    "LEARNING_METADATA_MEMBERSHIP_COUNT_MISMATCH");

    const [targetIdentity] = await target.unsafe("select current_database() as db, session_user as role, environment, provider, project_id, branch_id, identity_version from vocabflow_meta.environment_identity where id=1");
    assert(targetIdentity?.db === TARGET.database && targetIdentity.role === "vocabflow_migration"
      && targetIdentity.environment === "development" && targetIdentity.provider === "neon"
      && targetIdentity.project_id === TARGET.projectId && targetIdentity.branch_id === TARGET.branchId
      && targetIdentity.identity_version === 1, "NEON_CANONICAL_IDENTITY_MISMATCH");

    const [targetCounts] = await target.unsafe("select (select count(*)::int from vocabflow_app.vocabularies) vocabularies, (select count(*)::int from vocabflow_app.master_v2_development_projections) projections, (select count(*)::int from vocabflow_app.topics) topics, (select count(*)::int from vocabflow_app.learning_sets) learning_sets, (select count(*)::int from vocabflow_app.vocabulary_topics) topic_links, (select count(*)::int from vocabflow_app.learning_set_items) set_links, (select count(*)::int from vocabflow_app.learner_learning_sets) learner_set_links, (select count(*)::int from vocabflow_app.learner_profiles) learners, (select count(*)::int from vocabflow_app.learner_progress) progress, (select count(*)::int from vocabflow_app.review_events) reviews, (select count(*)::int from vocabflow_app.master_v2_development_import_runs) import_runs");
    const [priorRun] = await target.unsafe("select snapshot_fingerprint, source_queue_sha256, release_candidate_sha256, projection_fingerprint, imported_sense_count from vocabflow_app.master_v2_development_import_runs");
    const hasPriorRun = Boolean(priorRun);
    let retireMigrationSeed = false;
    if (!hasPriorRun) {
      const empty = Object.values(targetCounts).every((value) => value === 0);
      if (!empty) {
        assert(targetCounts.vocabularies === 30 && targetCounts.projections === 0
          && targetCounts.topics === 17 && targetCounts.learning_sets === 5
          && targetCounts.topic_links === 0 && targetCounts.set_links === 70
          && targetCounts.learner_set_links === 0 && targetCounts.learners === 0
          && targetCounts.progress === 0 && targetCounts.reviews === 0 && targetCounts.import_runs === 0,
        "NEON_TARGET_NOT_EMPTY");
        const seedVocabulary = await target.unsafe("select count(*)::int n, min(id)::int min_id, max(id)::int max_id, count(*) filter(where source_dataset is null and enabled=true)::int expected from vocabflow_app.vocabularies");
        const seedTopics = await target.unsafe("select source_topic from vocabflow_app.topics order by source_topic");
        const seedSets = await target.unsafe("select slug from vocabflow_app.learning_sets order by slug");
        assert(seedVocabulary[0]?.n === 30 && seedVocabulary[0]?.min_id === 1
          && seedVocabulary[0]?.max_id === 30 && seedVocabulary[0]?.expected === 30
          && JSON.stringify(seedTopics.map((row) => row.source_topic).sort())
            === JSON.stringify([...MIGRATION_SEED_TOPIC_CODES].sort())
          && JSON.stringify(seedSets.map((row) => row.slug).sort())
            === JSON.stringify([...MIGRATION_SEED_SET_SLUGS].sort()),
        "NEON_LEGACY_SEED_SHAPE_MISMATCH");
        retireMigrationSeed = true;
      }
    } else {
      assert(priorRun.snapshot_fingerprint === snapshotFile.value.snapshotFingerprint
        && priorRun.source_queue_sha256 === queueFile.sha256
        && priorRun.release_candidate_sha256 === candidateFile.sha256
        && priorRun.projection_fingerprint === snapshotFile.value.projectionFingerprint
        && priorRun.imported_sense_count === EXPECTED_SENSES,
      "NEON_EXISTING_IMPORT_RUN_CONFLICT");
      assert(targetCounts.vocabularies === EXPECTED_SENSES && targetCounts.projections === EXPECTED_SENSES
        && targetCounts.topics === 21 && targetCounts.learning_sets === 10
        && targetCounts.topic_links === 1768 && targetCounts.set_links === 5777
        && targetCounts.learners === 0 && targetCounts.progress === 0 && targetCounts.reviews === 0,
      "NEON_EXISTING_IMPORT_COUNTS_MISMATCH");
      const remoteHashes = await target.unsafe("select proposal_key, content_sha256 from vocabflow_app.master_v2_development_projections order by proposal_key");
      const expectedHashes = sourceRows.map((row) => [row.proposal_key, row.content_sha256]);
      assert(JSON.stringify(remoteHashes.map((row) => [row.proposal_key, row.content_sha256])) === JSON.stringify(expectedHashes),
        "NEON_EXISTING_IMPORT_HASH_MISMATCH");
    }

    if (!hasPriorRun) {
      const importRun = {
        snapshot_fingerprint: snapshotFile.value.snapshotFingerprint,
        source_queue_sha256: queueFile.sha256,
        release_candidate_sha256: candidateFile.sha256,
        projection_fingerprint: snapshotFile.value.projectionFingerprint,
        imported_sense_count: EXPECTED_SENSES,
        target_project_id: TARGET.projectId,
        target_branch_id: TARGET.branchId,
        target_database: TARGET.database,
      };
      const vocabularies = sourceRows.map((row) => ({
        id: row.vocabulary_id, word: row.word, ipa: row.ipa, vietnamese: row.vietnamese,
        vietnamese_override: row.vietnamese_override, definition_en: row.definition_en,
        example_en: row.example_en, image_url: row.image_url, image_quarantined: row.image_quarantined,
        audio_url: row.audio_url, topic: row.topic, level: row.level, enabled: row.enabled,
        content_version: row.content_version, source_dataset: row.source_dataset,
        source_record_id: row.source_record_id, created_at: row.vocabulary_created_at,
        updated_at: row.vocabulary_updated_at,
      }));
      const projections = sourceRows.map((row) => {
        const meta = metadataByKey.get(row.proposal_key);
        const provenance = typeof row.source_provenance === "string" ? JSON.parse(row.source_provenance) : { ...(row.source_provenance ?? {}) };
        provenance.developmentLearningMetadata = {
          manifestSha256: metadataFile.sha256,
          taxonomyVersion: "2.0.1",
          cefr: meta.cefr,
          topics: meta.topics,
          subtopics: meta.subtopics,
          domains: meta.domains,
          developmentTags: meta.developmentTags,
          ageGroups: meta.ageGroups,
          schoolGrades: meta.schoolGrades,
          examLabels: meta.examLabels,
          learningSets: meta.learningSets,
        };
        return {
          proposal_key: row.proposal_key, source_group_key: row.source_group_key,
          vocabulary_id: row.vocabulary_id, part_of_speech: row.part_of_speech, cefr: row.cefr,
          tags: row.tags, examples: row.examples, usage_notes: row.usage_notes,
          source_provenance: provenance, content_sha256: row.content_sha256,
          reviewer_identity: row.reviewer_identity, review_receipt_path: row.review_receipt_path,
          review_receipt_sha256: row.review_receipt_sha256, content_review_decision: row.content_review_decision,
          editorial_status: row.editorial_status, rights_status: row.rights_status,
          development_media: row.development_media, created_at: row.created_at, updated_at: row.updated_at,
        };
      });
      const stats = {};
      await target.begin(async (tx) => {
        if (retireMigrationSeed) {
          const [guard] = await tx.unsafe("select (select count(*)::int from vocabflow_app.learner_profiles) learners, (select count(*)::int from vocabflow_app.learner_progress) progress, (select count(*)::int from vocabflow_app.review_events) reviews, (select count(*)::int from vocabflow_app.master_v2_development_projections) projections, (select count(*)::int from vocabflow_app.vocabularies) vocabularies");
          assert(guard.learners === 0 && guard.progress === 0 && guard.reviews === 0
            && guard.projections === 0 && guard.vocabularies === 30, "NEON_MIGRATION_SEED_CLEANUP_GUARD_FAILED");
          await tx.unsafe("delete from vocabflow_app.learning_set_items where learning_set_id in (select id from vocabflow_app.learning_sets where slug = any($1::text[]))", [MIGRATION_SEED_SET_SLUGS]);
          await tx.unsafe("delete from vocabflow_app.learning_sets where slug = any($1::text[])", [MIGRATION_SEED_SET_SLUGS]);
          await tx.unsafe("delete from vocabflow_app.topics where source_topic = any($1::text[])", [MIGRATION_SEED_TOPIC_CODES]);
          const deleted = await tx.unsafe("delete from vocabflow_app.vocabularies where id between 1 and 30 and source_dataset is null and enabled=true returning id");
          assert(deleted.length === 30, "NEON_MIGRATION_SEED_CLEANUP_INCOMPLETE");
        }
        stats.importRuns = await insertRows(tx, batchStatements.importRuns, [importRun]);
        stats.topics = await insertRows(tx, batchStatements.topics, derived.topics);
        stats.learningSets = await insertRows(tx, batchStatements.learningSets, derived.learningSets);
        stats.vocabularies = await insertRows(tx, batchStatements.vocabularies, vocabularies);
        stats.projections = await insertRows(tx, batchStatements.projections, projections);
        stats.topicLinks = await insertRows(tx, batchStatements.topicLinks, derived.topicLinks);
        stats.learningLinks = await insertRows(tx, batchStatements.learningLinks, derived.learningLinks);
        await tx.unsafe("select setval(pg_get_serial_sequence('vocabflow_app.vocabularies','id'), coalesce((select max(id) from vocabflow_app.vocabularies),1), exists(select 1 from vocabflow_app.vocabularies))");
        await tx.unsafe("select setval(pg_get_serial_sequence('vocabflow_app.topics','id'), coalesce((select max(id) from vocabflow_app.topics),1), exists(select 1 from vocabflow_app.topics))");
        await tx.unsafe("select setval(pg_get_serial_sequence('vocabflow_app.learning_sets','id'), coalesce((select max(id) from vocabflow_app.learning_sets),1), exists(select 1 from vocabflow_app.learning_sets))");
      });
      inserted = true;
      const bytes = Object.values(stats).reduce((sum, row) => sum + row.sentBytes, 0);
      console.log("IMPORT_WRITE=PASS");
      console.log("MIGRATION_LEGACY_SEEDS_RETIRED=" + (retireMigrationSeed ? 30 : 0));
      console.log("IMPORT_ROWS=7311 vocabularies, 7311 projections, 21 topics, 10 learning sets, 1768 topic links, 5777 set memberships");
      console.log("IMPORT_REQUEST_PAYLOAD_BYTES=" + bytes);
    } else {
      console.log("IMPORT_WRITE=NOOP_ALREADY_IMPORTED");
    }

    const [readback] = await target.unsafe("select (select count(*)::int from vocabflow_app.vocabularies) vocabularies, (select count(*)::int from vocabflow_app.master_v2_development_projections) projections, (select count(distinct proposal_key)::int from vocabflow_app.master_v2_development_projections) unique_senses, (select count(*)::int from vocabflow_app.master_v2_development_projections where content_review_decision='PASS' and editorial_status='DRAFT' and rights_status='UNKNOWN_REVIEW_REQUIRED') valid_drafts, (select count(*)::int from vocabflow_app.master_v2_development_projections where content_review_decision<>'PASS' or editorial_status<>'DRAFT') excluded_or_changed, (select count(*)::int from vocabflow_app.topics) topics, (select count(*)::int from vocabflow_app.learning_sets) learning_sets, (select count(*)::int from vocabflow_app.vocabulary_topics) topic_links, (select count(*)::int from vocabflow_app.learning_set_items) set_links, (select count(*)::int from vocabflow_app.learner_profiles) learners, (select count(*)::int from vocabflow_app.learner_progress) progress, (select count(*)::int from vocabflow_app.review_events) reviews");
    assert(readback.vocabularies === EXPECTED_SENSES && readback.projections === EXPECTED_SENSES
      && readback.unique_senses === EXPECTED_SENSES && readback.valid_drafts === EXPECTED_SENSES
      && readback.excluded_or_changed === 0 && readback.topics === 21
      && readback.learning_sets === 10 && readback.topic_links === 1768
      && readback.set_links === 5777 && readback.learners === 0
      && readback.progress === 0 && readback.reviews === 0,
    "NEON_READBACK_INTEGRITY_FAILED");
    const remoteHashes = await target.unsafe("select proposal_key, content_sha256 from vocabflow_app.master_v2_development_projections order by proposal_key");
    const expectedHashes = sourceRows.map((row) => [row.proposal_key, row.content_sha256]);
    assert(JSON.stringify(remoteHashes.map((row) => [row.proposal_key, row.content_sha256])) === JSON.stringify(expectedHashes),
      "NEON_CONTENT_HASH_READBACK_MISMATCH");
    console.log("NEON_READBACK=PASS");
    console.log("NEON_COUNTS=" + JSON.stringify(readback));
    console.log("CONTENT_HASHES_VERIFIED=" + remoteHashes.length);
    console.log("IDEMPOTENT_IMPORT=" + (hasPriorRun ? "PASS_NOOP" : "READY_HASH_PINNED"));
    console.log("DATABASE_WRITES=" + (inserted ? "V2_CATALOG_ONLY" : "NONE"));
  } finally {
    await Promise.all([source.end({ timeout: 5 }), target.end({ timeout: 5 })]);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (/^[0-9A-Z]{2,10}$/u.test(code)) console.error("DB_ERROR_CODE=" + code);
  const safeDetail = message.replace(/postgres(?:ql)?:\/\/\S+/giu, "[redacted]")
    .replace(/(?:api[_-]?key|password)\s*[:=]\s*\S+/giu, "[redacted]").slice(0, 180);
  if (safeDetail) console.error("DB_ERROR_DETAIL=" + safeDetail);
  console.error(/^[A-Z][A-Z0-9_]{2,100}$/u.test(message) ? message : "V2_DEVELOPMENT_IMPORT_FAILED");
  process.exitCode = 1;
});
