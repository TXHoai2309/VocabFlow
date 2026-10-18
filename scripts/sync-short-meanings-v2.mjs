import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { reviewedShortMeaningsArtifact, resolveRepositoryPath } from "./short-meaning-v2-paths.mjs";

const expected = {
  projectId: "silent-sky-84582895",
  branchId: "br-cold-shadow-a17yg4k2",
  database: "neondb",
  count: 7311,
  contentFingerprint: "9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367"
};
const artifactDir = resolveRepositoryPath(process.env.SHORT_MEANING_ARTIFACT_DIR ?? reviewedShortMeaningsArtifact);
const apply = process.argv.includes("--apply");
if (process.argv.slice(2).some((arg) => arg !== "--apply")) throw new Error("INVALID_ARGUMENT");
if (!process.env.DATABASE_URL) throw new Error("MISSING_DATABASE_URL");
if ((process.env.DATABASE_ENV && process.env.DATABASE_ENV !== "development")
  || (process.env.VOCABFLOW_ENV && process.env.VOCABFLOW_ENV !== "development")
  || (process.env.VOCAB_DATASET_VERSION && process.env.VOCAB_DATASET_VERSION !== "v2")) {
  throw new Error("NON_DEVELOPMENT_V2_TARGET_BLOCKED");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.join(artifactDir, "manifest.json"), "utf8"));
const snapshot = JSON.parse(await readFile(path.join(artifactDir, "input-snapshot.json"), "utf8"));
const resultText = await readFile(path.join(artifactDir, "results.jsonl"), "utf8");
const results = resultText.trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
if (manifest.target?.projectId !== expected.projectId || manifest.target?.branchId !== expected.branchId || manifest.target?.database !== expected.database
  || snapshot.target?.projectId !== expected.projectId || snapshot.target?.branchId !== expected.branchId || snapshot.target?.database !== expected.database) {
  throw new Error("ARTIFACT_TARGET_MISMATCH");
}
if (manifest.contentFingerprint !== expected.contentFingerprint || snapshot.contentFingerprint !== expected.contentFingerprint) throw new Error("ARTIFACT_CONTENT_FINGERPRINT_MISMATCH");
if (manifest.rowCount !== expected.count || snapshot.rows?.length !== expected.count || results.length !== expected.count) throw new Error("ARTIFACT_COHORT_COUNT_MISMATCH");
if (manifest.resultSha256 !== sha256(resultText)) throw new Error("RESULT_ARTIFACT_HASH_MISMATCH");
const snapshotBody = { ...snapshot };
delete snapshotBody.snapshotFingerprint;
if (manifest.snapshotSha256 !== sha256(JSON.stringify(snapshotBody)) || manifest.snapshotFingerprint !== snapshot.snapshotFingerprint) throw new Error("INPUT_SNAPSHOT_HASH_MISMATCH");

const inputBySense = new Map(snapshot.rows.map((row) => [row.proposalIdentity, row]));
const resultIds = new Set();
for (const row of results) {
  const source = inputBySense.get(row.proposalIdentity);
  if (!source || source.vocabularyId !== row.vocabularyId || source.sourceContentHash !== row.sourceContentHash) throw new Error("RESULT_IDENTITY_OR_HASH_MISMATCH");
  if (resultIds.has(row.proposalIdentity)) throw new Error("DUPLICATE_RESULT_IDENTITY");
  resultIds.add(row.proposalIdentity);
  if (!["VERIFIED", "REVIEW_REQUIRED", "UNRESOLVED"].includes(row.validationStatus)) throw new Error("INVALID_VALIDATION_STATUS");
  if (row.validationStatus === "VERIFIED" && (!row.shortMeaningVi?.trim() || !row.sourceType || !row.evidenceRef)) throw new Error("VERIFIED_GLOSS_WITHOUT_EVIDENCE");
  if (row.sourceType === "AI_DERIVED") throw new Error("PAID_OR_AI_DERIVED_ROWS_NOT_AUTHORIZED");
  if (row.validationStatus === "UNRESOLVED" && row.shortMeaningVi !== null) throw new Error("UNRESOLVED_ROW_HAS_GLOSS");
}

const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => undefined });
try {
  await db.begin(`isolation level serializable${apply ? "" : ", read only"}`, async (tx) => {
    const [identity] = await tx`
      select environment, provider, project_id, branch_id, identity_version
      from vocabflow_meta.environment_identity where id = 1
    `;
    if (!identity || identity.environment !== "development" || identity.provider !== "neon"
      || identity.project_id !== expected.projectId || identity.branch_id !== expected.branchId) throw new Error("NEON_DEVELOPMENT_IDENTITY_MISMATCH");
    const [dbName] = await tx`select current_database() as database_name`;
    if (dbName?.database_name !== expected.database) throw new Error("DATABASE_NAME_MISMATCH");
    const [table] = await tx`select to_regclass('vocabflow_app.master_v2_short_meanings') is not null as exists`;
    if (!table?.exists) throw new Error("OVERLAY_MIGRATION_REQUIRED");

    const currentRows = await tx`
      select md.proposal_key as proposal_identity, v.id as vocabulary_id,
        md.content_sha256 as source_content_hash
      from vocabflow_app.vocabularies v
      join vocabflow_app.master_v2_development_projections md on md.vocabulary_id = v.id
      where v.enabled = true and v.source_dataset = 'VOCABFLOW_MASTER_V2_DEV'
      order by md.proposal_key
    `;
    if (currentRows.length !== expected.count) throw new Error(`SENSE_COUNT_MISMATCH_${currentRows.length}`);
    for (const current of currentRows) {
      const source = inputBySense.get(current.proposal_identity);
      if (!source || Number(current.vocabulary_id) !== source.vocabularyId || current.source_content_hash !== source.sourceContentHash) throw new Error("STALE_OR_MISMATCHED_SOURCE_SNAPSHOT");
    }
    const liveFingerprint = sha256(JSON.stringify(currentRows
      .map((row) => [row.proposal_identity, row.source_content_hash])
      .sort((a, b) => a[0].localeCompare(b[0]))));
    if (liveFingerprint !== expected.contentFingerprint) throw new Error("LIVE_CONTENT_FINGERPRINT_MISMATCH");

    if (!apply) {
      const [existing] = await tx`select count(*)::int as rows from vocabflow_app.master_v2_short_meanings`;
      console.log(JSON.stringify({ mode: "DRY_RUN", target: expected, artifactRows: results.length, currentOverlayRows: existing.rows }, null, 2));
      return;
    }

    let inserted = 0;
    let updated = 0;
    for (let offset = 0; offset < results.length; offset += 250) {
      const batch = results.slice(offset, offset + 250).map((row) => ({
        vocabulary_id: row.vocabularyId,
        proposal_identity: row.proposalIdentity,
        source_content_hash: row.sourceContentHash,
        short_meaning_vi: row.shortMeaningVi,
        source_type: row.sourceType,
        evidence_ref: row.evidenceRef,
        confidence: row.confidence,
        validation_status: row.validationStatus,
        reviewer_identity: row.reviewerIdentity,
        reviewed_at: row.reviewedAt,
        review_evidence: row.reviewEvidence,
        artifact_version: row.artifactVersion
      }));
      const changed = await tx`
        insert into vocabflow_app.master_v2_short_meanings (
          vocabulary_id, proposal_identity, source_content_hash, short_meaning_vi,
          source_type, evidence_ref, confidence, validation_status,
          reviewer_identity, reviewed_at, review_evidence, artifact_version
        )
        select x.vocabulary_id, x.proposal_identity, x.source_content_hash, x.short_meaning_vi,
          x.source_type, x.evidence_ref, x.confidence, x.validation_status,
          x.reviewer_identity, x.reviewed_at::timestamptz, x.review_evidence, x.artifact_version
        from jsonb_to_recordset(${tx.json(batch)}::jsonb) as x(
          vocabulary_id integer, proposal_identity text, source_content_hash text, short_meaning_vi text,
          source_type text, evidence_ref text, confidence text, validation_status text,
          reviewer_identity text, reviewed_at text, review_evidence text, artifact_version text
        )
        on conflict (vocabulary_id) do update set
          proposal_identity = excluded.proposal_identity,
          source_content_hash = excluded.source_content_hash,
          short_meaning_vi = excluded.short_meaning_vi,
          source_type = excluded.source_type,
          evidence_ref = excluded.evidence_ref,
          confidence = excluded.confidence,
          validation_status = excluded.validation_status,
          reviewer_identity = excluded.reviewer_identity,
          reviewed_at = excluded.reviewed_at,
          review_evidence = excluded.review_evidence,
          artifact_version = excluded.artifact_version,
          updated_at = now()
        where (master_v2_short_meanings.proposal_identity, master_v2_short_meanings.source_content_hash,
          master_v2_short_meanings.short_meaning_vi, master_v2_short_meanings.source_type,
          master_v2_short_meanings.evidence_ref, master_v2_short_meanings.confidence,
          master_v2_short_meanings.validation_status, master_v2_short_meanings.reviewer_identity,
          master_v2_short_meanings.reviewed_at, master_v2_short_meanings.review_evidence,
          master_v2_short_meanings.artifact_version)
        is distinct from (excluded.proposal_identity, excluded.source_content_hash,
          excluded.short_meaning_vi, excluded.source_type, excluded.evidence_ref, excluded.confidence,
          excluded.validation_status, excluded.reviewer_identity, excluded.reviewed_at,
          excluded.review_evidence, excluded.artifact_version)
        returning (xmax = 0) as inserted
      `;
      inserted += changed.filter((row) => row.inserted).length;
      updated += changed.filter((row) => !row.inserted).length;
    }
    const [readback] = await tx`
      select count(*)::int as rows,
        count(*) filter (where validation_status = 'VERIFIED')::int as verified,
        count(*) filter (where validation_status = 'REVIEW_REQUIRED')::int as review_required,
        count(*) filter (where validation_status = 'UNRESOLVED')::int as unresolved,
        count(*) filter (where source_content_hash !~ '^[0-9a-f]{64}$')::int as invalid_hashes
      from vocabflow_app.master_v2_short_meanings
      where vocabulary_id in (select id from vocabflow_app.vocabularies where source_dataset = 'VOCABFLOW_MASTER_V2_DEV' and enabled = true)
    `;
    if (readback.rows !== expected.count || readback.invalid_hashes !== 0) throw new Error("OVERLAY_READBACK_FAILED");
    console.log(JSON.stringify({ mode: "APPLY", target: expected, inserted, updated, rows: readback.rows,
      verified: readback.verified, reviewRequired: readback.review_required, unresolved: readback.unresolved,
      idempotentReplay: inserted === 0 && updated === 0 }, null, 2));
  });
} finally {
  await db.end();
}
