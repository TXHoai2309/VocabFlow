import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = process.cwd();
const WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const QUEUE_PATH = path.join(WORKSPACE, "independent-content-review-queue-v1.json");
const CANDIDATE_PATH = path.join(WORKSPACE, "master-v2-release-candidate-v9.json");
const RUNTIME_PATH = path.join(WORKSPACE, "development-runtime-v1/master-v2-development-runtime-snapshot-v1.json");
const METADATA_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-v1.json");
const OUTPUT_DIR = path.join(ROOT, ".vocabflow-local");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "master-v2-local-docker-snapshot-v1.json");
const SOURCE = "VOCABFLOW_MASTER_V2_DEV";
const DATABASE = "vocabflow_dev";
const MIGRATION_ROLE = "vocabflow_migration";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function assert(condition, code) { if (!condition) throw new Error(code); }
function readPinned(file, expected) {
  const bytes = readFileSync(file);
  const digest = sha256(bytes);
  if (expected && digest !== expected) throw new Error("LOCAL_ARTIFACT_SHA256_MISMATCH");
  return { bytes, digest, value: JSON.parse(bytes.toString("utf8")) };
}
function parseObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") { try { return parseObject(JSON.parse(value)); } catch { return {}; } }
  return {};
}
function parseReceiptEntry(receipt, proposalKey, hash) {
  return receipt.entries?.find((entry) => entry.proposalKey === proposalKey
    && (entry.effectiveContentHash === hash || entry.reviewedContentHash === hash)
    && (entry.decision ?? entry.verdict ?? entry.disposition ?? entry.revisedDecision) === "PASS") ?? null;
}
function assertLocalTarget(env) {
  if (env.VOCABFLOW_ENV !== "development" || env.DATABASE_ENV !== "development"
    || env.EXECUTION_CONTEXT !== "local-development" || env.DATABASE_DRIVER !== "postgres-js" || env.VERCEL_ENV) {
    throw new Error("LOCAL_DEVELOPMENT_ENVIRONMENT_REQUIRED");
  }
  const parsed = new URL(env.DATABASE_MIGRATION_URL ?? "");
  if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55432" || parsed.pathname !== `/${DATABASE}`
    || decodeURIComponent(parsed.username) !== MIGRATION_ROLE) throw new Error("LOCAL_DATABASE_TARGET_MISMATCH");
  return parsed;
}

function buildPayload() {
  const queueFile = readPinned(QUEUE_PATH);
  const candidateFile = readPinned(CANDIDATE_PATH);
  const runtimeFile = readPinned(RUNTIME_PATH);
  const metadataFile = readPinned(METADATA_PATH);
  const queue = queueFile.value;
  const candidate = candidateFile.value;
  const runtime = runtimeFile.value;
  const metadata = metadataFile.value;
  assert(candidate.sourceQueueFileSha256 === queueFile.digest && queue.entries?.length === 7320
    && candidate.senseDispositions?.length === 7320 && candidate.currentContentReviewDecisionCounts?.PASS === 7311,
  "LOCAL_V2_QUEUE_OR_CANDIDATE_PIN_FAILURE");
  assert(candidate.releaseApproved === false && candidate.runtimeImported === false && candidate.mediaIncluded === false
    && candidate.eligibleSenses?.length === 0, "LOCAL_V2_RELEASE_OR_MEDIA_GATE_CHANGED");
  assert(runtime.includedSenseCount === 7311 && runtime.approvalGranted === false && runtime.releaseEligible === false
    && runtime.rightsStatus === "UNKNOWN_REVIEW_REQUIRED" && runtime.editorialStatus === "DRAFT"
    && runtime.sourceQueueSha256 === queueFile.digest && runtime.releaseCandidateSha256 === candidateFile.digest,
  "LOCAL_V2_RUNTIME_SNAPSHOT_PIN_FAILURE");
  const runtimeSidecar = readFileSync(`${RUNTIME_PATH}.sha256`, "utf8").trim().split(/\s+/u)[0];
  assert(runtimeSidecar === sha256(readFileSync(RUNTIME_PATH)), "LOCAL_V2_RUNTIME_SNAPSHOT_SIDECAR_FAILURE");
  assert(metadata.sourcePins?.queueSha256 === queueFile.digest && metadata.sourcePins?.candidateSha256 === candidateFile.digest
    && metadata.sourcePins?.runtimeProjectionFingerprint === runtime.projectionFingerprint
    && metadata.senses?.length === 7311, "LOCAL_V2_METADATA_MANIFEST_PIN_FAILURE");

  const entries = new Map(queue.entries.map((entry, index) => [entry.proposalKey, { ...entry, queueIndex: index }]));
  assert(entries.size === queue.entries.length, "LOCAL_V2_DUPLICATE_QUEUE_IDENTITY");
  const current = new Map();
  for (const overlayRef of candidate.revisionOverlays ?? []) {
    const overlayPath = path.resolve(ROOT, overlayRef.path);
    if (!overlayPath.startsWith(`${ROOT}${path.sep}`)) throw new Error("LOCAL_V2_OVERLAY_OUTSIDE_REPOSITORY");
    const overlay = readPinned(overlayPath, overlayRef.sha256).value;
    for (const revision of overlay.revisions ?? []) {
      const base = entries.get(revision.proposalKey);
      const prior = current.get(revision.proposalKey);
      if (!base) continue;
      const expectedParent = prior?.hash ?? base.effectiveContentHash;
      if (revision.parentContentHash !== expectedParent) continue;
      current.set(revision.proposalKey, {
        hash: revision.effectiveContentHash,
        content: revision.contentForReview,
        sourceProvenance: revision.sourceProvenance ?? prior?.sourceProvenance ?? base.sourceProvenance,
        overlayPath: path.relative(ROOT, overlayPath).replaceAll("\\", "/"),
        overlaySha256: overlayRef.sha256,
        batchId: overlay.batchId ?? null,
      });
    }
  }
  const metadataByKey = new Map(metadata.senses.map((item) => [item.proposalKey, item]));
  const receiptCache = new Map();
  const pass = candidate.senseDispositions.filter((item) => item.contentReviewDecision === "PASS"
    && item.identityAndSourceValid === true && item.versionSelectionResolved === true);
  assert(pass.length === 7311 && new Set(pass.map((item) => item.proposalKey)).size === 7311,
    "LOCAL_V2_PASS_IDENTITY_SCOPE_FAILURE");

  const rows = pass.map((disposition) => {
    const entry = entries.get(disposition.proposalKey);
    const revised = current.get(disposition.proposalKey);
    const content = revised?.content ?? entry?.content;
    const sourceProvenance = revised?.sourceProvenance ?? entry?.sourceProvenance;
    const metadataSense = metadataByKey.get(disposition.proposalKey);
    assert(entry && content && metadataSense && metadataSense.contentSha256 === disposition.effectiveContentHash
      && (revised?.hash ?? entry.effectiveContentHash) === disposition.effectiveContentHash
      && /^[0-9a-f]{64}$/u.test(disposition.effectiveContentHash), "LOCAL_V2_CURRENT_CONTENT_HASH_UNRESOLVED");
    assert(disposition.rightsStatus === "UNKNOWN_REVIEW_REQUIRED" && disposition.releaseEligible === false,
      "LOCAL_V2_RIGHTS_GATE_CHANGED");
    const receiptPath = path.resolve(ROOT, disposition.contentReviewReceipt);
    if (!receiptPath.startsWith(`${ROOT}${path.sep}`)) throw new Error("LOCAL_V2_RECEIPT_OUTSIDE_REPOSITORY");
    let receipt = receiptCache.get(receiptPath);
    if (!receipt) {
      receipt = readPinned(receiptPath);
      receiptCache.set(receiptPath, receipt);
    }
    assert(receipt.value.reviewerIdentity === disposition.reviewerIdentity
      && parseReceiptEntry(receipt.value, disposition.proposalKey, disposition.effectiveContentHash),
    "LOCAL_V2_CURRENT_PASS_RECEIPT_MISMATCH");
    const examples = content.examples;
    const definition = content.definitionEn;
    const meaning = content.meaningVi;
    assert(typeof definition === "string" && definition.trim().length > 0
      && typeof meaning === "string" && meaning.trim().length > 0
      && Array.isArray(examples) && examples.length > 0
      && examples.every((example) => typeof example.en === "string" && example.en.trim().length > 0),
    "LOCAL_V2_CONTENT_SCHEMA_INVALID");
    const usageNotes = content.usageNotes ?? content.grammarNotesEn ?? null;
    return {
      proposalKey: disposition.proposalKey,
      sourceGroupKey: disposition.sourceGroupKey,
      sourceRecordId: entry.queueIndex,
      headword: entry.headword,
      displayForm: entry.displayForm || entry.headword,
      partOfSpeech: entry.partOfSpeech,
      cefr: metadataSense.cefr?.value ?? null,
      tags: metadataSense.developmentTags ?? [],
      definitionEn: definition,
      meaningVi: meaning,
      examples,
      usageNotes,
      contentSha256: disposition.effectiveContentHash,
      reviewerIdentity: disposition.reviewerIdentity,
      reviewReceiptPath: path.relative(ROOT, receiptPath).replaceAll("\\", "/"),
      reviewReceiptSha256: receipt.digest,
      sourceProvenance: {
        ...parseObject(sourceProvenance),
        masterV2Identity: {
          proposalKey: disposition.proposalKey,
          sourceGroupKey: disposition.sourceGroupKey,
          headword: entry.headword,
          displayForm: entry.displayForm || entry.headword,
          partOfSpeech: entry.partOfSpeech,
        },
        localDockerRestoreLineage: {
          queuePath: path.relative(ROOT, QUEUE_PATH).replaceAll("\\", "/"),
          queueSha256: queueFile.digest,
          releaseCandidatePath: path.relative(ROOT, CANDIDATE_PATH).replaceAll("\\", "/"),
          releaseCandidateSha256: candidateFile.digest,
          contentReviewReceiptPath: path.relative(ROOT, receiptPath).replaceAll("\\", "/"),
          contentReviewReceiptSha256: receipt.digest,
          currentContentHash: disposition.effectiveContentHash,
          revisionOverlayPath: revised?.overlayPath ?? null,
          revisionOverlaySha256: revised?.overlaySha256 ?? null,
          revisionBatchId: revised?.batchId ?? null,
        },
      },
      developmentMedia: { images: [], wordAudio: [], exampleAudio: [] },
    };
  });
  assert(rows.length === 7311 && new Set(rows.map((row) => row.proposalKey)).size === rows.length,
    "LOCAL_V2_PROJECTION_ROW_COUNT_FAILURE");
  const identityRows = runtime.identities;
  assert(identityRows.length === 7311 && new Set(identityRows.map((row) => row.proposalKey)).size === rows.length
    && identityRows.every((identity) => rows.some((row) => row.proposalKey === identity.proposalKey && row.contentSha256 === identity.contentSha256)),
  "LOCAL_V2_RUNTIME_SNAPSHOT_IDENTITY_MISMATCH");
  return { rows, queueFile, candidateFile, runtimeFile, metadataFile, runtime, passCount: pass.length };
}

async function main() {
  if (process.argv.includes("--apply") && process.argv.includes("--check")) throw new Error("CLI_ARGUMENT_INVALID");
  assertLocalTarget(process.env);
  const bundle = buildPayload();
  if (process.argv.includes("--check")) {
    console.log(JSON.stringify({ status: "LOCAL_V2_ARTIFACTS_VALID", senses: bundle.rows.length,
      queueSha256: bundle.queueFile.digest, candidateSha256: bundle.candidateFile.digest,
      runtimeSnapshotSha256: bundle.runtimeFile.digest, metadataSha256: bundle.metadataFile.digest,
      currentPassReceiptsVerified: bundle.passCount, rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
      target: "127.0.0.1:55432/vocabflow_dev", writes: 0 }, null, 2));
    return;
  }
  if (!process.argv.includes("--apply")) throw new Error("LOCAL_RESTORE_APPLY_FLAG_REQUIRED");
  const sql = postgres(process.env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, idle_timeout: 10, connect_timeout: 10 });
  let snapshot;
  let inserted = 0;
  try {
    snapshot = await sql.begin(async (tx) => {
      const [target] = await tx`
        SELECT current_database() AS database_name, session_user AS role_name,
          (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS provider,
          (SELECT environment FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS environment
      `;
      assert(target?.database_name === DATABASE && target.role_name === MIGRATION_ROLE
        && target.provider === "docker-local" && target.environment === "development", "LOCAL_RESTORE_TARGET_VERIFICATION_FAILED");
      const [before] = await tx`SELECT
        count(*)::int AS vocabulary_count,
        count(*) FILTER (WHERE source_dataset = ${SOURCE})::int AS v2_vocabulary_count,
        (SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS projection_count,
        (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress_count,
        (SELECT count(*)::int FROM vocabflow_app.review_events) AS review_count
        FROM vocabflow_app.vocabularies`;
      const oldV2 = await tx`SELECT v.id, v.source_record_id, p.proposal_key, p.content_sha256
        FROM vocabflow_app.vocabularies v LEFT JOIN vocabflow_app.master_v2_development_projections p ON p.vocabulary_id = v.id
        WHERE v.source_dataset = ${SOURCE}`;
      if (oldV2.some((row) => !row.proposal_key)) throw new Error("LOCAL_V2_ORPHAN_VOCABULARY_CONFLICT");
      const rowsByKey = new Map(bundle.rows.map((row) => [row.proposalKey, row]));
      for (const row of oldV2) {
        const input = rowsByKey.get(row.proposal_key);
        if (!input || row.content_sha256 !== input.contentSha256 || row.source_record_id !== input.sourceRecordId) {
          throw new Error("LOCAL_V2_EXISTING_PROJECTION_CONFLICT");
        }
      }

      for (let offset = 0; offset < bundle.rows.length; offset += 300) {
        const batch = bundle.rows.slice(offset, offset + 300);
        const vocabularyPayload = batch.map((row) => ({
          sourceRecordId: row.sourceRecordId,
          word: row.displayForm,
          vietnamese: row.meaningVi,
          definitionEn: row.definitionEn,
          exampleEn: row.examples[0]?.en ?? null,
        }));
        const newVocabularies = await tx`WITH input AS (
          SELECT * FROM jsonb_to_recordset(${tx.json(vocabularyPayload)}) AS x(
            "sourceRecordId" integer, word text, vietnamese text, "definitionEn" text, "exampleEn" text
          )
        ) INSERT INTO vocabflow_app.vocabularies (word, vietnamese, definition_en, example_en, enabled, content_version, source_dataset, source_record_id)
          SELECT word, vietnamese, "definitionEn", "exampleEn", true, 1, ${SOURCE}, "sourceRecordId"
          FROM input ORDER BY "sourceRecordId"
          ON CONFLICT (source_dataset, source_record_id) DO NOTHING
          RETURNING id`;
        inserted += newVocabularies.length;
        const sourceIds = batch.map((row) => row.sourceRecordId);
        const linked = await tx`SELECT id, source_record_id FROM vocabflow_app.vocabularies
          WHERE source_dataset = ${SOURCE} AND source_record_id = ANY(${sourceIds}::int[])`;
        const vocabularyId = new Map(linked.map((row) => [row.source_record_id, row.id]));
        assert(vocabularyId.size === batch.length, "LOCAL_V2_VOCABULARY_LINK_RESOLUTION_FAILED");
        const projectionPayload = batch.map((row) => ({ ...row, vocabularyId: vocabularyId.get(row.sourceRecordId) }));
        const insertedProjections = await tx`WITH input AS (
          SELECT * FROM jsonb_to_recordset(${tx.json(projectionPayload)}) AS x(
            "proposalKey" text, "sourceGroupKey" text, "sourceRecordId" integer, headword text,
            "displayForm" text, "partOfSpeech" text, cefr text, tags jsonb, "definitionEn" text,
            "meaningVi" text, examples jsonb, "usageNotes" text, "contentSha256" text,
            "reviewerIdentity" text, "reviewReceiptPath" text, "reviewReceiptSha256" text,
            "sourceProvenance" jsonb, "developmentMedia" jsonb, "vocabularyId" integer
          )
        ) INSERT INTO vocabflow_app.master_v2_development_projections (
          proposal_key, source_group_key, vocabulary_id, part_of_speech, cefr, tags, examples, usage_notes,
          source_provenance, content_sha256, reviewer_identity, review_receipt_path, review_receipt_sha256,
          content_review_decision, editorial_status, rights_status, development_media
        ) SELECT "proposalKey", "sourceGroupKey", "vocabularyId", "partOfSpeech", cefr, tags, examples, "usageNotes",
            "sourceProvenance", "contentSha256", "reviewerIdentity", "reviewReceiptPath", "reviewReceiptSha256",
            'PASS', 'DRAFT', 'UNKNOWN_REVIEW_REQUIRED', "developmentMedia"
          FROM input ORDER BY "sourceRecordId"
          ON CONFLICT (proposal_key) DO NOTHING
          RETURNING proposal_key`;
        assert(insertedProjections.length === linked.filter((v) => !oldV2.some((old) => old.source_record_id === v.source_record_id)).length,
          "LOCAL_V2_PROJECTION_INSERT_COUNT_MISMATCH");
      }

      const after = await tx`SELECT
        count(*) FILTER (WHERE source_dataset = ${SOURCE})::int AS v2_vocabulary_count,
        (SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS projection_count,
        (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress_count,
        (SELECT count(*)::int FROM vocabflow_app.review_events) AS review_count
        FROM vocabflow_app.vocabularies`;
      assert(after[0]?.v2_vocabulary_count === 7311 && after[0]?.projection_count === 7311,
        "LOCAL_V2_PROJECTION_TOTAL_MISMATCH");
      assert(after[0]?.progress_count === before.progress_count && after[0]?.review_count === before.review_count,
        "LOCAL_V2_RESTORE_CHANGED_LEARNER_HISTORY");
      const integrity = await tx`SELECT count(*)::int AS mismatches FROM vocabflow_app.master_v2_development_projections p
        JOIN vocabflow_app.vocabularies v ON v.id = p.vocabulary_id
        JOIN jsonb_to_recordset(${tx.json(bundle.rows.map((row) => ({ proposalKey: row.proposalKey, contentSha256: row.contentSha256, sourceRecordId: row.sourceRecordId })))}) AS i("proposalKey" text, "contentSha256" text, "sourceRecordId" integer)
          ON p.proposal_key = i."proposalKey"
        WHERE p.content_sha256 <> i."contentSha256" OR v.source_dataset <> ${SOURCE}
          OR v.source_record_id <> i."sourceRecordId" OR p.content_review_decision <> 'PASS'
          OR p.editorial_status <> 'DRAFT' OR p.rights_status <> 'UNKNOWN_REVIEW_REQUIRED'
          OR p.reviewer_identity = '' OR p.review_receipt_sha256 !~ '^[0-9a-f]{64}$'`;
      assert(integrity[0]?.mismatches === 0, "LOCAL_V2_CONTENT_HASH_OR_PROVENANCE_READBACK_FAILURE");
      const projectionFingerprint = sha256(stable(bundle.rows.map((row) => ({ proposalKey: row.proposalKey, contentSha256: row.contentSha256 })).sort((a, b) => a.proposalKey.localeCompare(b.proposalKey))));
      const snapshotFingerprint = sha256(stable({
        target: { provider: "docker-local", database: DATABASE },
        queueSha256: bundle.queueFile.digest,
        candidateSha256: bundle.candidateFile.digest,
        metadataSha256: bundle.metadataFile.digest,
        projectionFingerprint,
      }));
      await tx`INSERT INTO vocabflow_app.master_v2_development_import_runs (
        snapshot_fingerprint, source_queue_sha256, release_candidate_sha256, projection_fingerprint,
        imported_sense_count, target_project_id, target_branch_id, target_database
      ) VALUES (${snapshotFingerprint}, ${bundle.queueFile.digest}, ${bundle.candidateFile.digest}, ${projectionFingerprint},
        7311, 'local-docker', 'local-development', ${DATABASE}) ON CONFLICT (snapshot_fingerprint) DO NOTHING`;
      return {
        artifactType: "VOCABFLOW_MASTER_V2_LOCAL_DOCKER_SNAPSHOT",
        artifactVersion: 1,
        target: { provider: "docker-local", host: "127.0.0.1", port: 55432, database: DATABASE },
        status: "EFFECTIVE_DRAFT_CONTENT_REVIEW_PASS_RIGHTS_UNKNOWN_DEVELOPMENT_ONLY",
        editorialStatus: "DRAFT",
        approvalGranted: false,
        releaseEligible: false,
        rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
        includedSenseCount: 7311,
        projectionFingerprint,
        snapshotFingerprint,
        sourcePins: {
          queueSha256: bundle.queueFile.digest,
          candidateSha256: bundle.candidateFile.digest,
          runtimeSnapshotSha256: bundle.runtimeFile.digest,
          learningMetadataSha256: bundle.metadataFile.digest,
        },
        learnerHistoryBefore: { progress: before.progress_count, reviews: before.review_count },
        learnerHistoryAfter: { progress: after[0].progress_count, reviews: after[0].review_count },
        identities: bundle.rows.map((row) => ({ proposalKey: row.proposalKey, contentSha256: row.contentSha256 })).sort((a, b) => a.proposalKey.localeCompare(b.proposalKey)),
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const snapshotBytes = Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(OUTPUT_PATH, snapshotBytes);
  writeFileSync(`${OUTPUT_PATH}.sha256`, `${sha256(snapshotBytes)}  ${path.basename(OUTPUT_PATH)}\n`);
  console.log("LOCAL_V2_RESTORE=PASS");
  console.log(`EFFECTIVE_DRAFT_SENSES=${snapshot.includedSenseCount}`);
  console.log(`NEW_V2_VOCABULARIES=${inserted}`);
  console.log(`CONTENT_FINGERPRINT=${snapshot.projectionFingerprint}`);
  console.log(`LOCAL_SNAPSHOT_SHA256=${sha256(snapshotBytes)}`);
  console.log("APPROVED=0");
  console.log("RIGHTS_CLEARED=0");
  console.log(`LEARNER_PROGRESS_PRESERVED=${snapshot.learnerHistoryAfter.progress}`);
  console.log(`SRS_EVENTS_PRESERVED=${snapshot.learnerHistoryAfter.reviews}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "LOCAL_V2_RESTORE_FAILED";
  const databaseError = error && typeof error === "object" ? error : {};
  if (typeof databaseError.code === "string" && /^[A-Z0-9]{5}$/u.test(databaseError.code)) {
    console.error(`LOCAL_V2_DATABASE_ERROR=${databaseError.code}`);
  }
  if (typeof databaseError.constraint === "string" && /^[a-zA-Z0-9_]{1,120}$/u.test(databaseError.constraint)) {
    console.error(`LOCAL_V2_CONSTRAINT=${databaseError.constraint}`);
  }
  if (typeof databaseError.column === "string" && /^[a-zA-Z0-9_]{1,120}$/u.test(databaseError.column)) {
    console.error(`LOCAL_V2_COLUMN=${databaseError.column}`);
  }
  if (typeof databaseError.table === "string" && /^[a-zA-Z0-9_]{1,120}$/u.test(databaseError.table)) {
    console.error(`LOCAL_V2_TABLE=${databaseError.table}`);
  }
  if (typeof message === "string" && message.length > 0) {
    console.error(`LOCAL_V2_ERROR_DETAIL=${message.replace(/postgres(?:ql)?:\/\/[^\s]+/giu, "[connection redacted]").slice(0, 180)}`);
  }
  console.error(/^[A-Z][A-Z0-9_]{2,100}$/u.test(message) ? message : "LOCAL_V2_RESTORE_FAILED");
  process.exitCode = 1;
});
