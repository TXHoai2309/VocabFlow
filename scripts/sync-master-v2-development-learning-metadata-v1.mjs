import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = process.cwd();
const TARGET = Object.freeze({
  projectId: "shy-hill-72364426",
  branchId: "br-square-grass-b3af0nte",
  database: "neondb",
  endpointId: "ep-small-shadow-b3ny4993",
  appSchema: "vocabflow_app",
  stagingSchema: "vocabflow_editorial_staging"
});
const V2_SOURCE = "VOCABFLOW_MASTER_V2_DEV";
const WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const METADATA_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-v1.json");
const HASH_PATH = `${METADATA_PATH}.sha256`;
const QUEUE_PATH = path.join(WORKSPACE, "independent-content-review-queue-v1.json");
const CANDIDATE_PATH = path.join(WORKSPACE, "master-v2-release-candidate-v9.json");
const RUNTIME_PATH = path.join(WORKSPACE, "development-runtime-v1/master-v2-development-runtime-snapshot-v1.json");
const OXFORD_PATH = path.resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/oxford-normalized-inventory.json");
const TAXONOMY_PATH = path.resolve(ROOT, "vocabflow-dataset/taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json");
const REPORT_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-sync-v1.json");

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function readJson(file) { const bytes = readFileSync(file); return { bytes, value: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) }; }
function parsedJson(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; }
    catch { return {}; }
  }
  return {};
}
function parsedArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  return [];
}
function assert(condition, code) { if (!condition) throw new Error(code); }

function validateManifest() {
  const metadataFile = readJson(METADATA_PATH);
  const metadata = metadataFile.value;
  const sidecar = readFileSync(HASH_PATH, "utf8").trim().split(/\s+/u);
  assert(sidecar[0] === metadataFile.sha256 && sidecar[1] === path.basename(METADATA_PATH), "METADATA_SIDECAR_MISMATCH");
  assert(metadata.artifactType === "master-v2-development-learning-metadata"
    && metadata.artifactVersion === "1.0.0"
    && metadata.status === "DEVELOPMENT_ONLY_METADATA_OVERLAY"
    && metadata.doesNotChangeContentOrReviewHash === true
    && metadata.doesNotApproveOrClearRights === true, "METADATA_MANIFEST_GATE_FAILURE");

  const pins = metadata.sourcePins ?? {};
  const queueFile = readJson(QUEUE_PATH);
  const candidateFile = readJson(CANDIDATE_PATH);
  const runtimeFile = readJson(RUNTIME_PATH);
  const oxfordFile = readJson(OXFORD_PATH);
  const taxonomyFile = readJson(TAXONOMY_PATH);
  assert(pins.queueSha256 === queueFile.sha256 && pins.candidateSha256 === candidateFile.sha256
    && pins.oxfordInventorySha256 === oxfordFile.sha256 && pins.taxonomySha256 === taxonomyFile.sha256,
  "METADATA_SOURCE_PIN_MISMATCH");
  assert(runtimeFile.value.includedSenseCount === 7311
    && pins.runtimeProjectionFingerprint === runtimeFile.value.projectionFingerprint
    && runtimeFile.value.releaseCandidateSha256 === candidateFile.sha256
    && runtimeFile.value.sourceQueueSha256 === queueFile.sha256, "METADATA_RUNTIME_SNAPSHOT_PIN_MISMATCH");
  assert(candidateFile.value.senseDispositions?.length === 7320
    && candidateFile.value.currentContentReviewDecisionCounts?.PASS === 7311
    && candidateFile.value.releaseApproved === false && candidateFile.value.runtimeImported === false,
  "V2_REVIEW_OR_RELEASE_GATE_CHANGED");

  const overlays = new Map();
  for (const overlayRef of candidateFile.value.revisionOverlays ?? []) {
    const overlayPath = path.resolve(ROOT, overlayRef.path);
    assert(overlayPath.startsWith(`${ROOT}${path.sep}`), "REVISION_OVERLAY_OUTSIDE_REPOSITORY");
    const overlay = readJson(overlayPath);
    assert(overlay.sha256 === overlayRef.sha256, "REVISION_OVERLAY_PIN_MISMATCH");
    for (const revision of overlay.value.revisions ?? []) {
      const list = overlays.get(revision.proposalKey) ?? [];
      list.push(revision.effectiveContentHash);
      overlays.set(revision.proposalKey, list);
    }
  }
  const dispositions = new Map(candidateFile.value.senseDispositions.map((row) => [row.proposalKey, row]));
  const queueKeys = new Set(queueFile.value.entries.map((row) => row.proposalKey));
  assert(Array.isArray(metadata.senses) && metadata.senses.length === 7311
    && new Set(metadata.senses.map((row) => row.proposalKey)).size === 7311, "METADATA_SENSE_SCOPE_FAILURE");
  for (const sense of metadata.senses) {
    const disposition = dispositions.get(sense.proposalKey);
    assert(queueKeys.has(sense.proposalKey) && disposition?.contentReviewDecision === "PASS"
      && disposition.identityAndSourceValid === true && disposition.versionSelectionResolved === true
      && disposition.rightsStatus === "UNKNOWN_REVIEW_REQUIRED" && disposition.releaseEligible === false
      && disposition.effectiveContentHash === sense.contentSha256, "METADATA_SENSE_NOT_CURRENT_PASS");
    const pinnedHash = overlays.get(sense.proposalKey)?.at(-1);
    if (pinnedHash) assert(pinnedHash === sense.contentSha256, "METADATA_REVISED_CONTENT_HASH_MISMATCH");
    assert(/^[0-9a-f]{64}$/u.test(sense.contentSha256), "INVALID_METADATA_CONTENT_HASH");
    if (sense.cefr) {
      assert(sense.cefr.status === "SOURCE_VERIFIED" && sense.cefr.evidence.length > 0
        && sense.cefr.evidence.every((evidence) => evidence.corpus === "OXFORD_5000"
          && /^[0-9a-f]{64}$/u.test(evidence.recordEvidenceSha256)), "UNPINNED_CEFR_ASSIGNMENT");
    }
    for (const assignment of [...(sense.topics ?? []), ...(sense.domains ?? [])]) {
      assert(assignment.status === "INFERRED_REVIEWABLE" && assignment.confidence === "HIGH"
        && assignment.taxonomyId === pins.taxonomyId && assignment.taxonomyVersion === pins.taxonomyVersion
        && assignment.evidenceType && assignment.matchedEvidence, "INFERRED_ASSIGNMENT_EVIDENCE_MISSING");
    }
    assert(Array.isArray(sense.developmentTags), "DEVELOPMENT_TAGS_MISSING");
  }
  const senseByKey = new Map(metadata.senses.map((sense) => [sense.proposalKey, sense]));
  const setSlugs = new Set();
  for (const learningSet of metadata.learningSets ?? []) {
    assert(!setSlugs.has(learningSet.slug) && Array.isArray(learningSet.members) && learningSet.members.length > 0, "INVALID_OR_EMPTY_LEARNING_SET");
    setSlugs.add(learningSet.slug);
    for (const member of learningSet.members) assert(senseByKey.get(member.proposalKey)?.contentSha256 === member.contentSha256, "LEARNING_SET_MEMBER_HASH_MISMATCH");
  }
  for (const topic of metadata.topics ?? []) {
    assert(Array.isArray(topic.members), "INVALID_TOPIC_MEMBERS");
    for (const member of topic.members) assert(senseByKey.get(member.proposalKey)?.contentSha256 === member.contentSha256, "TOPIC_MEMBER_HASH_MISMATCH");
  }
  const topicMemberships = metadata.topics.reduce((sum, topic) => sum + topic.members.length, 0);
  const topicSenseKeys = new Set(metadata.topics.flatMap((topic) => topic.members.map((member) => member.proposalKey)));
  const subtopicCount = metadata.senses.reduce((sum, sense) => sum + (sense.subtopics?.length ?? 0), 0);
  const domainMemberships = metadata.senses.reduce((sum, sense) => sum + (sense.domains?.length ?? 0), 0);
  const domainSenseCount = metadata.senses.filter((sense) => (sense.domains?.length ?? 0) > 0).length;
  const setMemberships = metadata.learningSets.reduce((sum, set) => sum + set.members.length, 0);
  assert(metadata.counts.topicSenseMemberships === topicMemberships
    && metadata.counts.sensesWithTopic === topicSenseKeys.size
    && metadata.counts.sensesWithSubtopic === subtopicCount
    && metadata.counts.domainSenseMemberships === domainMemberships
    && metadata.counts.sensesWithDomain === domainSenseCount
    && metadata.counts.learningSets === metadata.learningSets.length
    && metadata.counts.learningSetMemberships === setMemberships
    && metadata.counts.sourceVerifiedCefr === metadata.senses.filter((sense) => sense.cefr?.status === "SOURCE_VERIFIED").length,
  "METADATA_MANIFEST_COUNT_INTEGRITY_FAILURE");
  assert(metadata.counts?.senses === 7311
    && metadata.counts.sourceVerifiedCefr === 5539
    && metadata.counts.ageGroupAssignments === 0
    && metadata.counts.schoolGradeAssignments === 0
    && metadata.counts.examAssignments === 0, "METADATA_COUNTS_OR_UNSUPPORTED_CLASSIFICATION_FAILURE");
  return { metadata, metadataSha256: metadataFile.sha256, candidate: candidateFile.value, queue: queueFile.value };
}

async function verifyProviderTarget(env) {
  assert(env.VOCABFLOW_ENV === "development" && env.DATABASE_ENV === "development"
    && env.EXECUTION_CONTEXT === "local-development" && !env.VERCEL_ENV, "LOCAL_DEVELOPMENT_ENVIRONMENT_REQUIRED");
  assert(env.NEON_API_KEY, "NEON_TARGET_VERIFICATION_REQUIRED");
  for (const [name, role] of [["BOOTSTRAP_DATABASE_URL", "vocabflow_identity_bootstrap"], ["DATABASE_MIGRATION_URL", "vocabflow_migration"], ["DATABASE_URL", "vocabflow_runtime"]]) {
    assert(env[name], `${name}_REQUIRED`);
    const parsed = new URL(env[name]);
    const hostMatches = parsed.hostname.startsWith(`${TARGET.endpointId}.`) || parsed.hostname.startsWith(`${TARGET.endpointId}-pooler.`);
    assert(decodeURIComponent(parsed.pathname.replace(/^\//u, "")) === TARGET.database
      && decodeURIComponent(parsed.username) === role && parsed.hostname.endsWith(".neon.tech") && hostMatches,
    "DEVELOPMENT_CONNECTION_TARGET_MISMATCH");
  }
  const headers = { Authorization: `Bearer ${env.NEON_API_KEY}` };
  const [branchResponse, endpointsResponse] = await Promise.all([
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/branches/${TARGET.branchId}`, { headers }),
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/endpoints`, { headers })
  ]);
  assert(branchResponse.ok && endpointsResponse.ok, "NEON_DEVELOPMENT_TARGET_VERIFICATION_FAILED");
  const branch = await branchResponse.json();
  const endpoints = await endpointsResponse.json();
  const endpoint = (endpoints.endpoints ?? []).find((item) => item.id === TARGET.endpointId);
  assert(branch?.branch?.project_id === TARGET.projectId && branch?.branch?.id === TARGET.branchId
    && endpoint?.branch_id === TARGET.branchId && endpoint?.type === "read_write", "NEON_DEVELOPMENT_TARGET_MISMATCH");
}

async function verifyLocalDockerTarget(env) {
  assert(env.VOCABFLOW_ENV === "development" && env.DATABASE_ENV === "development"
    && env.EXECUTION_CONTEXT === "local-development" && !env.VERCEL_ENV
    && env.DATABASE_DRIVER === "postgres-js", "LOCAL_DEVELOPMENT_ENVIRONMENT_REQUIRED");
  for (const [name, role] of [["DATABASE_MIGRATION_URL", "vocabflow_migration"], ["DATABASE_URL", "vocabflow_runtime"]]) {
    assert(env[name], `${name}_REQUIRED`);
    const parsed = new URL(env[name]);
    assert(new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
      && new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname)
      && parsed.port === "55432" && decodeURIComponent(parsed.pathname.replace(/^\//u, "")) === "vocabflow_dev"
      && decodeURIComponent(parsed.username) === role, "LOCAL_DATABASE_TARGET_MISMATCH");
  }
  const db = postgres(env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    const [identity] = await db`SELECT current_database() AS database_name, current_user AS role_name,
      (SELECT environment FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS environment,
      (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS provider,
      (SELECT host FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS host,
      (SELECT port FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS port`;
    assert(identity?.database_name === "vocabflow_dev" && identity.role_name === "vocabflow_migration"
      && identity.environment === "development" && identity.provider === "docker-local"
      && identity.host === "127.0.0.1" && identity.port === 55432, "LOCAL_DATABASE_MARKER_MISMATCH");
  } finally { await db.end(); }
}

async function readTargetIdentity(db) {
  const [row] = await db`SELECT current_database() AS database_name, current_user AS role_name,
    (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
    (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id,
    (SELECT environment::text FROM vocabflow_meta.environment_identity WHERE id = 1) AS environment`;
  assert(row?.database_name === TARGET.database && row.project_id === TARGET.projectId
    && row.branch_id === TARGET.branchId && row.environment === "development", "POST_CONNECT_DEVELOPMENT_TARGET_MISMATCH");
}

async function preservedCounts(tx, localMode = false) {
  if (localMode) {
    const [runtime] = await tx`SELECT
      count(*)::int AS all_vocabularies,
      count(*) FILTER (WHERE source_dataset IS DISTINCT FROM ${V2_SOURCE})::int AS legacy_vocabularies,
      count(*) FILTER (WHERE source_dataset = ${V2_SOURCE})::int AS v2_vocabularies,
      (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress_rows,
      (SELECT count(*)::int FROM vocabflow_app.review_events) AS review_rows,
      0::int AS media_assets, 0::int AS media_mappings, 0::int AS media_rights,
      0::int AS media_mapping_events, 0::int AS media_rights_events
      FROM vocabflow_app.vocabularies`;
    return [runtime];
  }
  const [runtime] = await tx`SELECT
    count(*)::int AS all_vocabularies,
    count(*) FILTER (WHERE source_dataset IS DISTINCT FROM ${V2_SOURCE})::int AS legacy_vocabularies,
    count(*) FILTER (WHERE source_dataset = ${V2_SOURCE})::int AS v2_vocabularies,
    (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress_rows,
    (SELECT count(*)::int FROM vocabflow_app.review_events) AS review_rows,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_assets_v2 WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS media_assets,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_mappings_v2 WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS media_mappings,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_rights_v1 WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS media_rights,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_mapping_review_events_v1 WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS media_mapping_events,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_rights_review_events_v1 WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS media_rights_events
    FROM vocabflow_app.vocabularies`;
  return [runtime];
}

function namesForAssignments(items) { return items.map((item) => String(item)).filter(Boolean); }

async function main() {
  const apply = process.argv.includes("--apply");
  const localMode = process.argv.includes("--local-docker");
  const { metadata, metadataSha256 } = validateManifest();
  if (process.argv.includes("--validate-only")) {
    console.log(JSON.stringify({ status: "OFFLINE_MANIFEST_VALID", metadataSha256, counts: metadata.counts,
      sourcePinsVerified: true, currentPassSenseHashesVerified: metadata.senses.length }, null, 2));
    return;
  }
  if (localMode) await verifyLocalDockerTarget(process.env);
  else await verifyProviderTarget(process.env);
  const bootstrap = localMode ? null : postgres(process.env.BOOTSTRAP_DATABASE_URL, { max: 1, prepare: false, onnotice: () => undefined });
  const migration = postgres(process.env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    if (!localMode) await readTargetIdentity(bootstrap);
    const plan = await migration.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const [counts] = await tx`SELECT
        count(*)::int AS projection_rows,
        count(*) FILTER (WHERE p.content_review_decision = 'PASS' AND p.editorial_status = 'DRAFT' AND p.rights_status = 'UNKNOWN_REVIEW_REQUIRED')::int AS eligible_projection_rows
        FROM vocabflow_app.master_v2_development_projections p`;
      const projections = await tx`SELECT p.proposal_key, p.content_sha256, p.cefr, p.tags, p.source_provenance,
        p.content_review_decision, p.editorial_status, p.rights_status, v.id AS vocabulary_id,
        v.source_dataset, v.enabled
        FROM vocabflow_app.master_v2_development_projections p
        JOIN vocabflow_app.vocabularies v ON v.id = p.vocabulary_id`;
      assert(counts.projection_rows === 7311 && counts.eligible_projection_rows === 7311
        && projections.length === 7311, "DEVELOPMENT_PROJECTION_BASELINE_MISMATCH");
      const byKey = new Map(projections.map((row) => [row.proposal_key, row]));
      assert(byKey.size === 7311, "DUPLICATE_DEVELOPMENT_PROJECTION_IDENTITY");
      let newCefr = 0;
      for (const sense of metadata.senses) {
        const row = byKey.get(sense.proposalKey);
        assert(row && row.source_dataset === V2_SOURCE && row.enabled === true
          && row.content_sha256 === sense.contentSha256 && row.content_review_decision === "PASS"
          && row.editorial_status === "DRAFT" && row.rights_status === "UNKNOWN_REVIEW_REQUIRED", "NEON_V2_CONTENT_OR_STATUS_MISMATCH");
        if (sense.cefr?.value) {
          assert(row.cefr == null || row.cefr === sense.cefr.value, "SOURCE_VERIFIED_CEFR_CONFLICT");
          if (row.cefr == null) newCefr++;
        }
      }
      const [baseline] = await preservedCounts(tx, localMode);
      return { byKey, baseline, newCefr };
    });

    const manifestFingerprint = sha256(stable({ metadataSha256, sourcePins: metadata.sourcePins, counts: metadata.counts }));
    if (!apply) {
      console.log(JSON.stringify({ status: "DRY_RUN_PASS", target: localMode ? "docker-local/127.0.0.1:55432/vocabflow_dev" : `${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}`,
        manifestSha256: metadataSha256, manifestFingerprint, senses: metadata.senses.length,
        topics: metadata.topics.length, topicMemberships: metadata.counts.topicSenseMemberships,
        domains: metadata.counts.domainSenseMemberships, learningSets: metadata.learningSets.length,
        learningSetMemberships: metadata.counts.learningSetMemberships, sourceVerifiedCefr: metadata.counts.sourceVerifiedCefr,
        ageGroups: 0, schoolGrades: 0, examLabels: 0, sourceVerifiedCefrToAdd: plan.newCefr,
        existingLegacyVocabularyRows: plan.baseline.legacy_vocabularies,
        existingProgressRows: plan.baseline.progress_rows, existingReviewEvents: plan.baseline.review_rows,
        mediaAssetsPreserved: plan.baseline.media_assets, mediaMappingsPreserved: plan.baseline.media_mappings,
        writes: "none; rerun with --apply to sync Development metadata" }, null, 2));
      return;
    }

    const result = await migration.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('vocabflow-master-v2-development-learning-metadata-v1'))`;
      const before = await preservedCounts(tx, localMode);
      assert(stable(before[0]) === stable(plan.baseline), "DEVELOPMENT_OR_MEDIA_BASELINE_CHANGED_DURING_SYNC");
      const projectionRows = await tx`SELECT p.proposal_key, p.content_sha256, p.cefr, p.tags, p.source_provenance,
        p.content_review_decision, p.editorial_status, p.rights_status, v.id AS vocabulary_id,
        v.source_dataset, v.enabled
        FROM vocabflow_app.master_v2_development_projections p JOIN vocabflow_app.vocabularies v ON v.id = p.vocabulary_id`;
      const projectionByKey = new Map(projectionRows.map((row) => [row.proposal_key, row]));
      assert(projectionByKey.size === 7311, "DEVELOPMENT_PROJECTION_CHANGED_DURING_SYNC");
      for (const sense of metadata.senses) {
        const current = projectionByKey.get(sense.proposalKey);
        assert(current && current.source_dataset === V2_SOURCE && current.enabled === true
          && current.content_sha256 === sense.contentSha256 && current.content_review_decision === "PASS"
          && current.editorial_status === "DRAFT" && current.rights_status === "UNKNOWN_REVIEW_REQUIRED"
          && (current.cefr == null || current.cefr === sense.cefr?.value || sense.cefr == null),
        "DEVELOPMENT_PROJECTION_CHANGED_DURING_SYNC");
      }

      const topicPayload = metadata.topics.map((topic) => ({ slug: topic.slug, name: topic.name,
        description: topic.description, sortOrder: topic.sortOrder }));
      for (const topic of topicPayload) {
        await tx`INSERT INTO vocabflow_app.topics (slug, name, description, sort_order, enabled)
          VALUES (${topic.slug}, ${topic.name}, ${topic.description}, ${topic.sortOrder}, true)
          ON CONFLICT (slug) DO NOTHING`;
      }
      const learningSetPayload = metadata.learningSets.map((set) => ({ slug: set.slug, name: set.name,
        description: set.description, grade: set.grade, sortOrder: set.sortOrder }));
      for (const set of learningSetPayload) {
        await tx`INSERT INTO vocabflow_app.learning_sets (slug, name, description, grade, enabled, sort_order)
          VALUES (${set.slug}, ${set.name}, ${set.description}, ${set.grade}, true, ${set.sortOrder})
          ON CONFLICT (slug) DO NOTHING`;
      }
      const topicRows = await tx`SELECT id, slug FROM vocabflow_app.topics WHERE slug = ANY(${topicPayload.map((topic) => topic.slug)}::text[]) AND enabled = true`;
      const setRows = await tx`SELECT id, slug FROM vocabflow_app.learning_sets WHERE slug = ANY(${learningSetPayload.map((set) => set.slug)}::text[]) AND enabled = true`;
      const topicId = new Map(topicRows.map((row) => [row.slug, row.id]));
      const setId = new Map(setRows.map((row) => [row.slug, row.id]));
      assert(topicId.size === topicPayload.length && setId.size === learningSetPayload.length, "METADATA_CATALOG_ID_RESOLUTION_FAILURE");

      const vocabularyTopicRows = [];
      for (const topic of metadata.topics) {
        const id = topicId.get(topic.slug);
        for (const member of topic.members) vocabularyTopicRows.push({ topicId: id, vocabularyId: projectionByKey.get(member.proposalKey)?.vocabulary_id, proposalKey: member.proposalKey, contentSha256: member.contentSha256 });
      }
      const setItemRows = [];
      for (const set of metadata.learningSets) {
        const id = setId.get(set.slug);
        set.members.forEach((member, index) => setItemRows.push({ learningSetId: id, vocabularyId: projectionByKey.get(member.proposalKey)?.vocabulary_id, proposalKey: member.proposalKey, contentSha256: member.contentSha256, sortOrder: index }));
      }
      for (const row of [...vocabularyTopicRows, ...setItemRows]) {
        const sense = metadata.senses.find((item) => item.proposalKey === row.proposalKey);
        const projection = projectionByKey.get(row.proposalKey);
        assert(sense && projection && projection.vocabulary_id === row.vocabularyId
          && projection.content_sha256 === row.contentSha256, "METADATA_MEMBERSHIP_IDENTITY_OR_HASH_MISMATCH");
      }
      const expectedTopicPairs = new Map(vocabularyTopicRows.map((row) => [`${row.topicId}:${row.vocabularyId}`, row.contentSha256]));
      const existingTopicPairs = await tx`SELECT vt.topic_id, vt.vocabulary_id, v.source_dataset, md.content_sha256
        FROM vocabflow_app.vocabulary_topics vt
        JOIN vocabflow_app.vocabularies v ON v.id = vt.vocabulary_id
        LEFT JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id = v.id
        WHERE vt.topic_id = ANY(${topicRows.map((row) => row.id)}::int[])`;
      for (const row of existingTopicPairs) {
        if (row.source_dataset === V2_SOURCE) {
          assert(expectedTopicPairs.get(`${row.topic_id}:${row.vocabulary_id}`) === row.content_sha256,
            "UNEXPECTED_EXISTING_V2_TOPIC_MEMBERSHIP");
        }
      }
      const expectedSetPairs = new Map(setItemRows.map((row) => [`${row.learningSetId}:${row.vocabularyId}:${row.sortOrder}`, row.contentSha256]));
      const existingSetItems = await tx`SELECT lsi.learning_set_id, lsi.vocabulary_id, lsi.sort_order, v.source_dataset, md.content_sha256
        FROM vocabflow_app.learning_set_items lsi
        JOIN vocabflow_app.vocabularies v ON v.id = lsi.vocabulary_id
        LEFT JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id = v.id
        WHERE lsi.learning_set_id = ANY(${setRows.map((row) => row.id)}::int[])`;
      for (const row of existingSetItems) {
        if (row.source_dataset === V2_SOURCE) {
          assert(expectedSetPairs.get(`${row.learning_set_id}:${row.vocabulary_id}:${row.sort_order}`) === row.content_sha256,
            "UNEXPECTED_EXISTING_V2_LEARNING_SET_MEMBERSHIP");
        }
      }
      if (vocabularyTopicRows.length) {
        await tx`WITH input AS (
          SELECT * FROM jsonb_to_recordset(${tx.json(vocabularyTopicRows)}) AS x("topicId" integer, "vocabularyId" integer, "proposalKey" text, "contentSha256" text)
        ) INSERT INTO vocabflow_app.vocabulary_topics (vocabulary_id, topic_id)
          SELECT "vocabularyId", "topicId" FROM input ORDER BY "topicId", "vocabularyId"
          ON CONFLICT (vocabulary_id, topic_id) DO NOTHING`;
      }
      if (setItemRows.length) {
        await tx`WITH input AS (
          SELECT * FROM jsonb_to_recordset(${tx.json(setItemRows)}) AS x("learningSetId" integer, "vocabularyId" integer, "proposalKey" text, "contentSha256" text, "sortOrder" integer)
        ) INSERT INTO vocabflow_app.learning_set_items (learning_set_id, vocabulary_id, sort_order)
          SELECT "learningSetId", "vocabularyId", "sortOrder" FROM input ORDER BY "learningSetId", "sortOrder", "vocabularyId"
          ON CONFLICT (learning_set_id, vocabulary_id) DO NOTHING`;
      }

      const metadataRows = metadata.senses.map((sense) => {
        const current = projectionByKey.get(sense.proposalKey);
        const existingTags = parsedArray(current.tags).filter((tag) => typeof tag === "string");
        const tags = [...new Set([...existingTags, ...namesForAssignments(sense.developmentTags)])].sort((a, b) => a.localeCompare(b));
        const oldProvenance = parsedJson(current.source_provenance);
        const learningMetadata = {
          version: 1,
          manifestSha256: metadataSha256,
          ruleset: metadata.ruleset.id,
          status: "DEVELOPMENT_ONLY",
          contentSha256: sense.contentSha256,
          cefr: sense.cefr,
          topics: sense.topics,
          subtopics: sense.subtopics,
          domains: sense.domains,
          assignments: { topics: sense.topics, subtopics: sense.subtopics, domains: sense.domains },
          ageGroups: sense.ageGroups,
          schoolGrades: sense.schoolGrades,
          examLabels: sense.examLabels,
          learningSets: sense.learningSets,
          sourceNoteIdentities: sense.sourceNoteIdentities
        };
        const existingLearningMetadata = oldProvenance.developmentLearningMetadataV1;
        assert(existingLearningMetadata == null || stable(existingLearningMetadata) === stable(learningMetadata),
          "EXISTING_DEVELOPMENT_LEARNING_METADATA_CONFLICT");
        const sourceProvenance = { ...oldProvenance, developmentLearningMetadataV1: learningMetadata };
        return { proposalKey: sense.proposalKey, contentSha256: sense.contentSha256,
          cefr: sense.cefr?.value ?? null, tags, sourceProvenance };
      });
      await tx`WITH input AS (
        SELECT * FROM jsonb_to_recordset(${tx.json(metadataRows)}) AS x(
          "proposalKey" text, "contentSha256" text, cefr text, tags jsonb, "sourceProvenance" jsonb
        )
      ) UPDATE vocabflow_app.master_v2_development_projections p
        SET cefr = COALESCE(p.cefr, input.cefr), tags = input.tags,
            source_provenance = input."sourceProvenance"
        FROM input
        WHERE p.proposal_key = input."proposalKey"
          AND p.content_sha256 = input."contentSha256"
          AND p.content_review_decision = 'PASS' AND p.editorial_status = 'DRAFT'
          AND p.rights_status = 'UNKNOWN_REVIEW_REQUIRED'
          AND (p.cefr IS DISTINCT FROM COALESCE(p.cefr, input.cefr)
            OR p.tags IS DISTINCT FROM input.tags
            OR p.source_provenance->'developmentLearningMetadataV1' IS DISTINCT FROM input."sourceProvenance"->'developmentLearningMetadataV1')`;

      const [topicReadback] = await tx`SELECT count(*)::int AS count FROM (
        SELECT DISTINCT vt.topic_id, vt.vocabulary_id FROM vocabflow_app.vocabulary_topics vt
        JOIN jsonb_to_recordset(${tx.json(vocabularyTopicRows)}) AS i("topicId" integer, "vocabularyId" integer, "proposalKey" text, "contentSha256" text)
          ON vt.topic_id = i."topicId" AND vt.vocabulary_id = i."vocabularyId"
      ) x`;
      assert(topicReadback.count === vocabularyTopicRows.length, "TOPIC_MEMBERSHIP_READBACK_MISMATCH");
      const [setReadback] = await tx`SELECT count(*)::int AS count FROM (
        SELECT DISTINCT lsi.learning_set_id, lsi.vocabulary_id FROM vocabflow_app.learning_set_items lsi
        JOIN jsonb_to_recordset(${tx.json(setItemRows)}) AS i("learningSetId" integer, "vocabularyId" integer, "proposalKey" text, "contentSha256" text, "sortOrder" integer)
          ON lsi.learning_set_id = i."learningSetId" AND lsi.vocabulary_id = i."vocabularyId" AND lsi.sort_order = i."sortOrder"
      ) x`;
      assert(setReadback.count === setItemRows.length, "LEARNING_SET_MEMBERSHIP_READBACK_MISMATCH");
      const [badProjection] = await tx`SELECT count(*)::int AS count FROM vocabflow_app.master_v2_development_projections p
        JOIN jsonb_to_recordset(${tx.json(metadataRows)}) AS i("proposalKey" text, "contentSha256" text, cefr text, tags jsonb, "sourceProvenance" jsonb)
          ON p.proposal_key = i."proposalKey"
        WHERE p.content_sha256 <> i."contentSha256" OR p.tags IS DISTINCT FROM i.tags
          OR p.cefr IS DISTINCT FROM COALESCE(p.cefr, i.cefr)
          OR p.source_provenance->'developmentLearningMetadataV1' IS DISTINCT FROM i."sourceProvenance"->'developmentLearningMetadataV1'
          OR p.content_review_decision <> 'PASS' OR p.editorial_status <> 'DRAFT' OR p.rights_status <> 'UNKNOWN_REVIEW_REQUIRED'`;
      assert(badProjection.count === 0, "METADATA_PROJECTION_READBACK_MISMATCH");
      const after = await preservedCounts(tx, localMode);
      assert(stable(after[0]) === stable(before[0]), "RUNTIME_OR_MEDIA_PRESERVATION_FAILURE");
      const [catalog] = await tx`SELECT
        (SELECT count(*)::int FROM vocabflow_app.topics t WHERE t.slug = ANY(${topicPayload.map((topic) => topic.slug)}::text[])) AS topics,
        (SELECT count(*)::int FROM vocabflow_app.learning_sets s WHERE s.slug = ANY(${learningSetPayload.map((set) => set.slug)}::text[])) AS learning_sets`;
      assert(catalog.topics === topicPayload.length && catalog.learning_sets === learningSetPayload.length, "CATALOG_READBACK_MISMATCH");
      return { before: before[0], after: after[0], topicMemberships: vocabularyTopicRows.length,
        learningSetMemberships: setItemRows.length, topics: topicPayload.length, learningSets: learningSetPayload.length };
    });

    const report = { artifactType: "MASTER_V2_DEVELOPMENT_LEARNING_METADATA_SYNC", version: 1,
      status: "SYNCED_DEVELOPMENT_ONLY", createdAt: new Date().toISOString(), target: TARGET,
      metadataManifestSha256: metadataSha256, manifestFingerprint,
      counts: { senses: metadata.senses.length, topicSenseMemberships: result.topicMemberships,
        domainSenseMemberships: metadata.counts.domainSenseMemberships, learningSets: result.learningSets,
        learningSetMemberships: result.learningSetMemberships, sourceVerifiedCefr: metadata.counts.sourceVerifiedCefr,
        ageGroupAssignments: 0, schoolGradeAssignments: 0, examAssignments: 0 },
      preservation: { before: result.before, after: result.after, runtimeUnchanged: true, mediaMetadataUnchanged: true },
      contentChanged: false, reviewStatusChanged: false, rightsStatusChanged: false, learnerProgressChanged: false };
    mkdirSync(WORKSPACE, { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(`${REPORT_PATH}.sha256`, `${sha256(readFileSync(REPORT_PATH))}  ${path.basename(REPORT_PATH)}\n`, "utf8");
    console.log(JSON.stringify({ status: "SYNCED_DEVELOPMENT_ONLY", target: localMode ? "docker-local/127.0.0.1:55432/vocabflow_dev" : `${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}`,
      senses: report.counts.senses, topics: result.topics, topicMemberships: result.topicMemberships,
      learningSets: result.learningSets, learningSetMemberships: result.learningSetMemberships,
      sourceVerifiedCefr: report.counts.sourceVerifiedCefr, legacyVocabulariesPreserved: result.after.legacy_vocabularies,
      progressRowsPreserved: result.after.progress_rows, reviewEventsPreserved: result.after.review_rows,
      mediaAssetsPreserved: result.after.media_assets, mediaMappingsPreserved: result.after.media_mappings,
      manifestFingerprint, idempotent: true, report: path.relative(ROOT, REPORT_PATH) }, null, 2));
  } finally {
    await Promise.allSettled([...(bootstrap ? [bootstrap.end()] : []), migration.end()]);
  }
}

main().catch((error) => {
  const code = error instanceof Error ? error.message : "UNKNOWN_SYNC_FAILURE";
  console.error(`LEARNING_METADATA_SYNC_FAILED=${code}`);
  process.exitCode = 1;
});
