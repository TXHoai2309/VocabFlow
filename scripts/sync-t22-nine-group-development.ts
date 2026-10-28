import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { getConnectionTarget } from "../config/database-targets";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";

const ROOT = process.cwd();
const SCHEMA = "vocabflow_editorial_staging";
const SYNC = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const BUNDLE_PATH = path.join(SYNC, "t22-nine-group-authoring-bundle-v1.json");
const AMENDMENT_PATH = path.join(SYNC, "t22-nine-group-owner-authorization-amendment-v1.json");
const SNAPSHOT_PATH = path.join(SYNC, "resolved-effective-staging-snapshot-v1.json");
const ATTACHMENT_PATH = "C:\\Users\\User\\.codex\\attachments\\628bb3f9-c6ec-44c8-b076-645c62a4a8a7\\Pasted text.txt";
const TARGET = Object.freeze({
  projectId: "shy-hill-72364426",
  branchId: "br-square-grass-b3af0nte",
  endpointId: "ep-small-shadow-b3ny4993",
  databaseName: "neondb",
});
const BASELINE = Object.freeze({ identities: 7451, effective: 7172, pendingContent: 133, pendingVersion: 146,
  snapshotSha256: "377f65129d8390050ddd93db6f004f7c45350f1bddca508c41c478929a546cd5",
  snapshotFingerprint: "ad20b2092de92b43aee03eb42e101164e3830caeedd244d9bffe4d434f70fc59" });
const RIGHTS = "UNKNOWN_REVIEW_REQUIRED";
type Row = Record<string, any>;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(file: string): Row {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("AUTHORING_ARTIFACT_INVALID");
  return parsed as Row;
}

function verifyArtifacts() {
  const bundle = readJson(BUNDLE_PATH);
  const amendment = readJson(AMENDMENT_PATH);
  const { amendmentSha256, ...amendmentPayload } = amendment;
  if (sha(stable(amendmentPayload)) !== amendmentSha256 || bundle.ownerAuthorizationAmendmentSha256 !== amendmentSha256) {
    throw new Error("OWNER_AUTHORIZATION_AMENDMENT_HASH_MISMATCH");
  }
  const { bundleSha256, ...bundlePayload } = bundle;
  if (sha(stable(bundlePayload)) !== bundleSha256) throw new Error("AUTHORING_BUNDLE_HASH_MISMATCH");
  if (amendment.authorization !== "AUTHORIZED" || amendment.scope?.oneTimeUse !== true
    || amendment.scope?.groups?.join(",") !== "true,try,turn,unconscious,union,unlikely,upset,virus,wing"
    || bundle.authorizationScope?.join(",") !== "true,try,turn,unconscious,union,unlikely,upset,virus,wing") {
    throw new Error("OWNER_AUTHORIZATION_SCOPE_MISMATCH");
  }
  if (bundle.baseline?.stagingSnapshotSha256 !== BASELINE.snapshotSha256
    || bundle.baseline?.stagingSnapshotFingerprint !== BASELINE.snapshotFingerprint) throw new Error("STAGING_SNAPSHOT_PIN_MISMATCH");
  const attachmentSha = sha(readFileSync(ATTACHMENT_PATH));
  if (attachmentSha !== amendment.sourceAuthorization?.sha256) throw new Error("OWNER_ATTACHMENT_HASH_MISMATCH");
  const snapshotSha = sha(readFileSync(SNAPSHOT_PATH));
  if (snapshotSha !== BASELINE.snapshotSha256 || readJson(SNAPSHOT_PATH).snapshotFingerprint !== BASELINE.snapshotFingerprint) {
    throw new Error("DEVELOPMENT_SNAPSHOT_FILE_CHANGED");
  }
  for (const [file, pin] of Object.entries(bundle.source.normalizedInventorySha256 as Record<string, Row>)) {
    const actual = sha(readFileSync(path.join(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe", file)));
    if (actual !== pin.sha256) throw new Error(`SOURCE_INVENTORY_HASH_MISMATCH:${file}`);
  }
  const records = bundle.records as Row[];
  if (records.length !== 22 || new Set(records.map((row) => row.proposalKey)).size !== records.length
    || new Set(records.map((row) => row.candidateGroupKey)).size !== 9) throw new Error("AUTHORING_RECORD_IDENTITY_COUNT_MISMATCH");
  for (const row of records) {
    if (row.contentStatus !== "DRAFT" || row.formalApproval !== false || row.canonicalIdsAllocated !== 0
      || row.rights !== RIGHTS || row.rightsStatus !== RIGHTS
      || row.sourceEvidence.some((ref: Row) => ref.partOfSpeech !== row.partOfSpeech)) {
      throw new Error(`DRAFT_OR_RIGHTS_GATE_MISMATCH:${row.proposalKey}`);
    }
    if (sha(stable(row.content)) !== row.effectiveContentHash
      || row.provisionalAdmission?.status !== "PROVISIONAL_DRAFT_ONLY"
      || row.provisionalAdmission?.semanticCorrectnessVerified !== false
      || row.provisionalAdmission?.independentReviewAccepted !== false) throw new Error(`CONTENT_OR_ADMISSION_HASH_MISMATCH:${row.proposalKey}`);
    if (!Array.isArray(row.sourceEvidence) || row.sourceEvidence.length === 0
      || !Array.isArray(row.sourceProvenanceReferences?.sourceCueIdentityReferences)
      || row.sourceProvenanceReferences.sourceCueIdentityReferences.length === 0
      || row.sourceProvenanceReferences.sourceCueIdentityReferences.some((ref: Row) => !/^[0-9a-f]{64}$/.test(ref.recordEvidenceSha256))) {
      throw new Error(`PROVENANCE_REFERENCE_MISSING:${row.proposalKey}`);
    }
  }
  return { bundle, amendment };
}

async function connectVerified(purpose: "bootstrap" | "runtime") {
  const { context, environment } = readContext();
  if (context !== "local-development" || environment !== "development" || process.env.DATABASE_ENV !== "development" || process.env.VERCEL_ENV) {
    throw new Error("LOCAL_DEVELOPMENT_ONLY");
  }
  const target = getConnectionTarget("development", purpose);
  const verified = await assertResolvedTargetBeforeMutation({ context, source: "dev-launcher", environment, purpose,
    operation: "db-check", target });
  const endpointId = verified.fingerprint.host.split(".")[0]?.replace(/-pooler$/, "");
  if (verified.resolved.expected.projectId !== TARGET.projectId || verified.resolved.expected.branchId !== TARGET.branchId
    || verified.resolved.expected.databaseName !== TARGET.databaseName || endpointId !== TARGET.endpointId) {
    throw new Error("NEON_DEVELOPMENT_TARGET_MISMATCH");
  }
  const sql = openSql(verified.url);
  try {
    await assertPostConnectIdentity(sql, target);
    const [identity] = await sql<Row[]>`SELECT current_database() AS database_name, current_user AS role_name,
      (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
      (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id`;
    const expectedRole = purpose === "bootstrap" ? "vocabflow_identity_bootstrap" : "vocabflow_runtime";
    if (!identity || identity.database_name !== TARGET.databaseName || identity.role_name !== expectedRole
      || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId) throw new Error("NEON_CONNECTION_IDENTITY_MISMATCH");
    return sql;
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}

async function runtimeCounts() {
  const sql = await connectVerified("runtime");
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const tables = await tx.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='vocabflow_app' AND table_type='BASE TABLE' ORDER BY table_name");
      const counts: Record<string, number> = {};
      for (const row of tables) {
        const name = String(row.table_name).replace(/"/g, "\"\"");
        const [count] = await tx.unsafe(`SELECT count(*)::int AS rows FROM \"vocabflow_app\".\"${name}\"`);
        counts[String(row.table_name)] = Number(count?.rows ?? 0);
      }
      return counts;
    });
  } finally { await sql.end({ timeout: 5 }); }
}

async function readStagingCounts(tx: any) {
  const [identityCount] = await tx`SELECT count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)}`;
  const statuses = await tx`SELECT resolution_status,count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} GROUP BY resolution_status`;
  const statusMap = Object.fromEntries(statuses.map((row: Row) => [String(row.resolution_status), Number(row.count)]));
  const [integrity] = await tx`SELECT count(*) FILTER (WHERE i.resolution_status='EFFECTIVE')::int AS effective_identities,
      count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND d.editorial_status='DRAFT')::int AS effective_draft_rows,
      count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND trim(i.effective_content_hash)=trim(d.effective_content_hash))::int AS effective_hash_matches,
      count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND d.rights_status<>i.rights_status)::int AS rights_mismatches
    FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i LEFT JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d USING(proposal_key)`;
  const [pendingVersion] = await tx`SELECT count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} WHERE resolution_status='PENDING_VERSION_DECISION'`;
  const [media] = await tx`SELECT
      (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_assets_v2`)} WHERE manifest_version='english-vocabulary-4600-media-v2.0.0') AS assets,
      (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_mappings_v2`)} WHERE manifest_version='english-vocabulary-4600-media-v2.0.0') AS mappings,
      (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_rights_v1`)} WHERE manifest_version='english-vocabulary-4600-media-v2.0.0') AS rights`;
  const [versionIntegrity] = await tx`SELECT count(*) FILTER (WHERE selected_count=1)::int AS exactly_one_selected_version,
      count(*) FILTER (WHERE selected_count=0)::int AS no_selected_version,
      count(*) FILTER (WHERE selected_count>1)::int AS multiple_selected_versions
    FROM (SELECT i.proposal_key,count(*) FILTER (WHERE cv.selection_status='EFFECTIVE'
      AND trim(cv.candidate_content_hash)=trim(i.effective_content_hash))::int AS selected_count
      FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i LEFT JOIN ${tx.unsafe(`${SCHEMA}.candidate_versions`)} cv USING(proposal_key)
      WHERE i.resolution_status='EFFECTIVE' GROUP BY i.proposal_key) selected`;
  return { identityCount: Number(identityCount.count), statuses: statusMap, effectiveIntegrity: integrity,
    pendingVersion: Number(pendingVersion.count), media: media, versions: versionIntegrity };
}

function assertBaseline(counts: Row) {
  if (counts.identityCount !== BASELINE.identities || counts.statuses.EFFECTIVE !== BASELINE.effective
    || counts.statuses.PENDING_CONTENT_VALIDATION !== BASELINE.pendingContent || counts.pendingVersion !== BASELINE.pendingVersion
    || counts.effectiveIntegrity.effective_identities !== BASELINE.effective
    || counts.effectiveIntegrity.effective_draft_rows !== BASELINE.effective
    || counts.effectiveIntegrity.effective_hash_matches !== BASELINE.effective
    || counts.effectiveIntegrity.rights_mismatches !== 0
    || counts.pendingVersion !== 146
    || counts.media.assets !== 13977 || counts.media.mappings !== 14012 || counts.media.rights !== 13977
    || counts.versions.multiple_selected_versions !== 0 || counts.versions.no_selected_version !== 573) {
    throw new Error("DEVELOPMENT_STAGING_BASELINE_MISMATCH");
  }
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env"));
  const { bundle, amendment } = verifyArtifacts();
  const records = bundle.records as Row[];
  if (process.argv[2] === "--verify") {
    console.log(`PASS T22 source, owner authorization, content hashes and bundle integrity records=${records.length}`);
    return;
  }
  if (process.argv[2] !== "--apply") throw new Error("USAGE: sync-t22-nine-group-development.ts --verify|--apply");
  const beforeRuntime = await runtimeCounts();
  const sql = await connectVerified("bootstrap");
  let applyResult: Row;
  try {
    applyResult = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      await tx`SELECT pg_advisory_xact_lock(hashtext('vocabflow-master-v2-t22-nine-group-authorized-tranche-v1'))`;
      const [identity] = await tx<Row[]>`SELECT current_database() AS database_name,current_user AS role_name,
        current_setting('transaction_read_only') AS read_only,
        (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id=1) AS project_id,
        (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id=1) AS branch_id`;
      if (identity?.database_name !== TARGET.databaseName || identity.role_name !== "vocabflow_identity_bootstrap"
        || identity.read_only !== "off" || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId) {
        throw new Error("DEVELOPMENT_WRITE_TARGET_MISMATCH");
      }
      const [grants] = await tx<Row[]>`SELECT has_table_privilege(current_user,'vocabflow_editorial_staging.identity_registry','INSERT') AS identity_insert,
        has_table_privilege(current_user,'vocabflow_editorial_staging.draft_proposals','INSERT') AS draft_insert,
        has_table_privilege(current_user,'vocabflow_editorial_staging.candidate_versions','INSERT') AS candidate_insert,
        has_table_privilege(current_user,'vocabflow_editorial_staging.import_batches','INSERT') AS batch_insert,
        has_schema_privilege('vocabflow_runtime','vocabflow_editorial_staging','USAGE') AS runtime_schema_usage`;
      if (!grants?.identity_insert || !grants.draft_insert || !grants.candidate_insert || !grants.batch_insert || grants.runtime_schema_usage !== false) {
        throw new Error("DEVELOPMENT_STAGING_PRIVILEGE_BOUNDARY_MISMATCH");
      }

      const proposalKeys = records.map((row) => row.proposalKey);
      const groupKeys = [...new Set(records.map((row) => row.candidateGroupKey))];
      const existingKeys = await tx<Row[]>`SELECT proposal_key,source_group_key,resolution_status,effective_content_hash,staging_batch_id,source_provenance
        FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} WHERE proposal_key=ANY(${tx.array(proposalKeys)}::text[]) ORDER BY proposal_key`;
      const [existingBatch] = await tx<Row[]>`SELECT batch_id,bundle_sha256,source_fingerprint,completeness,group_count,proposal_count
        FROM ${tx.unsafe(`${SCHEMA}.import_batches`)} WHERE batch_id=${bundle.batchId}`;
      if (existingKeys.length !== 0 && existingKeys.length !== records.length) throw new Error("PARTIAL_T22_TRANCHE_ALREADY_PRESENT");

      if (existingKeys.length === records.length) {
        if (!existingBatch || String(existingBatch.bundle_sha256).trim() !== bundle.bundleSha256
          || String(existingBatch.source_fingerprint).trim() !== bundle.source.acceptedInventoryFingerprint
          || Number(existingBatch.group_count) !== 9 || Number(existingBatch.proposal_count) !== records.length) {
          throw new Error("T22_IDEMPOTENT_BATCH_HASH_MISMATCH");
        }
        for (const row of records) {
          const live = existingKeys.find((item) => item.proposal_key === row.proposalKey);
          if (!live || live.source_group_key !== row.sourceGroupKey || live.resolution_status !== "EFFECTIVE"
            || String(live.effective_content_hash).trim() !== row.effectiveContentHash
            || String(live.staging_batch_id).trim() !== bundle.batchId
            || live.source_provenance?.t22NineGroupAuthoringV1?.ownerAuthorizationAmendmentSha256 !== amendment.amendmentSha256) {
            throw new Error(`T22_IDEMPOTENT_IDENTITY_MISMATCH:${row.proposalKey}`);
          }
          const [draft] = await tx<Row[]>`SELECT editorial_status,rights_status,headword,part_of_speech,definition_en,meaning_vi,examples,
              display_form,trim(effective_content_hash) AS effective_content_hash,trim(batch_id) AS batch_id,source_provenance
            FROM ${tx.unsafe(`${SCHEMA}.draft_proposals`)} WHERE proposal_key=${row.proposalKey}`;
          const [candidate] = await tx<Row[]>`SELECT trim(candidate_content_hash) AS candidate_content_hash,selection_status,
              trim(staging_batch_id) AS staging_batch_id,candidate_content,source_provenance_references,original_artifact_identity
            FROM ${tx.unsafe(`${SCHEMA}.candidate_versions`)} WHERE proposal_key=${row.proposalKey}`;
          if (!draft || !candidate || draft.editorial_status !== "DRAFT" || draft.rights_status !== RIGHTS
            || draft.headword !== row.headword || draft.part_of_speech !== row.partOfSpeech
            || draft.effective_content_hash !== row.effectiveContentHash || candidate.candidate_content_hash !== row.effectiveContentHash
            || candidate.selection_status !== "EFFECTIVE" || candidate.staging_batch_id !== bundle.batchId
            || sha(stable(candidate.candidate_content)) !== row.effectiveContentHash
            || stable(candidate.candidate_content) !== stable(row.content)) throw new Error(`T22_IDEMPOTENT_CONTENT_MISMATCH:${row.proposalKey}`);
        }
        const counts = await readStagingCounts(tx);
        if (counts.identityCount !== BASELINE.identities + records.length
          || counts.statuses.EFFECTIVE !== BASELINE.effective + records.length
          || counts.statuses.PENDING_CONTENT_VALIDATION !== BASELINE.pendingContent
          || counts.pendingVersion !== BASELINE.pendingVersion || counts.media.assets !== 13977
          || counts.media.mappings !== 14012 || counts.media.rights !== 13977
          || counts.versions.multiple_selected_versions !== 0 || counts.versions.no_selected_version !== 573) {
          throw new Error("T22_IDEMPOTENT_REPLAY_POST_STATE_MISMATCH");
        }
        return { outcome: "IDEMPOTENT_NOOP", synced: 0, verified: records.length, counts };
      }
      if (existingBatch) throw new Error("T22_BATCH_EXISTS_WITHOUT_ALL_IDENTITIES");
      const snapshotHash = sha(readFileSync(SNAPSHOT_PATH));
      if (snapshotHash !== BASELINE.snapshotSha256 || readJson(SNAPSHOT_PATH).snapshotFingerprint !== BASELINE.snapshotFingerprint) {
        throw new Error("DEVELOPMENT_BASELINE_SNAPSHOT_DRIFT");
      }
      const countsBefore = await readStagingCounts(tx);
      assertBaseline(countsBefore);
      const existingGroups = await tx<Row[]>`SELECT DISTINCT source_group_key FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)}
        WHERE source_group_key=ANY(${tx.array(groupKeys)}::text[]) ORDER BY source_group_key`;
      if (existingGroups.length) throw new Error("T22_SOURCE_GROUP_ALREADY_STAGED");

      await tx`INSERT INTO ${tx.unsafe(`${SCHEMA}.import_batches`)}
        (batch_id,bundle_sha256,source_fingerprint,completeness,group_count,proposal_count)
        VALUES (${bundle.batchId},${bundle.bundleSha256},${bundle.source.acceptedInventoryFingerprint},'PARTIAL',9,${records.length})`;

      const identityRows = records.map((row) => ({ proposal_key: row.proposalKey, source_group_key: row.sourceGroupKey,
        resolution_status: "EFFECTIVE", effective_content_hash: row.effectiveContentHash,
        rights_status: RIGHTS, staging_batch_id: bundle.batchId,
        source_provenance: {
          provenanceVersion: "master-v2-t22-nine-group-authoring-v1",
          t22NineGroupAuthoringV1: {
            bundleSha256: bundle.bundleSha256, batchId: bundle.batchId,
            ownerAuthorizationAmendmentSha256: amendment.amendmentSha256,
            stagingSnapshotBeforeSha256: bundle.baseline.stagingSnapshotSha256,
            stagingSnapshotBeforeFingerprint: bundle.baseline.stagingSnapshotFingerprint,
            sourceInventoryFingerprint: bundle.source.acceptedInventoryFingerprint,
            sourceNoteIdentity: row.sourceNoteIdentity,
            linkedSourceCueKeys: row.linkedSourceCueKeys,
            sourceCueIdentityReferences: row.sourceProvenanceReferences.sourceCueIdentityReferences,
            oewnEvidenceReferences: row.sourceEvidence,
            semanticCorrectnessVerified: false, independentReviewAccepted: false,
            rightsStatus: RIGHTS, contentHash: row.effectiveContentHash,
          },
        }}));
      const insertedIdentities = await tx<Row[]>`INSERT INTO ${tx.unsafe(`${SCHEMA}.identity_registry`)}
        (proposal_key,source_group_key,resolution_status,effective_content_hash,rights_status,staging_batch_id,source_provenance)
        SELECT r.proposal_key,r.source_group_key,r.resolution_status,r.effective_content_hash,r.rights_status,r.staging_batch_id,r.source_provenance
        FROM jsonb_to_recordset(${tx.json(identityRows)}::jsonb) AS r(proposal_key text,source_group_key text,resolution_status text,
          effective_content_hash text,rights_status text,staging_batch_id text,source_provenance jsonb) RETURNING proposal_key`;
      if (insertedIdentities.length !== records.length) throw new Error("T22_IDENTITY_INSERT_COUNT_MISMATCH");

      const draftRows = records.map((row) => ({ proposal_key: row.proposalKey, candidate_group_key: row.sourceGroupKey,
        headword: row.headword, part_of_speech: row.partOfSpeech,
        sense_identity: { proposalKey: row.proposalKey, senseLabelEn: row.content.senseLabelEn,
          sourceOewnSenseIds: row.sourceOewnSenseIds, canonicalIdsAllocated: 0 },
        definition_en: row.content.definitionEn, meaning_vi: row.content.meaningVi,
        examples: row.content.examples, usage_notes: row.content.grammarNotesEn,
        display_form: row.displayFormProposal, source_provenance: row.sourceProvenanceReferences,
        effective_content_hash: row.effectiveContentHash, editorial_status: "DRAFT", rights_status: RIGHTS, batch_id: bundle.batchId }));
      const insertedDrafts = await tx<Row[]>`INSERT INTO ${tx.unsafe(`${SCHEMA}.draft_proposals`)}
        (proposal_key,candidate_group_key,headword,part_of_speech,sense_identity,definition_en,meaning_vi,examples,usage_notes,
         display_form,source_provenance,effective_content_hash,editorial_status,rights_status,batch_id)
        SELECT r.proposal_key,r.candidate_group_key,r.headword,r.part_of_speech,r.sense_identity,r.definition_en,r.meaning_vi,r.examples,
          r.usage_notes,r.display_form,r.source_provenance,r.effective_content_hash,r.editorial_status,r.rights_status,r.batch_id
        FROM jsonb_to_recordset(${tx.json(draftRows)}::jsonb) AS r(proposal_key text,candidate_group_key text,headword text,part_of_speech text,
          sense_identity jsonb,definition_en text,meaning_vi text,examples jsonb,usage_notes text,display_form text,source_provenance jsonb,
          effective_content_hash text,editorial_status text,rights_status text,batch_id text) RETURNING proposal_key`;
      if (insertedDrafts.length !== records.length) throw new Error("T22_DRAFT_INSERT_COUNT_MISMATCH");

      const candidateRows = records.map((row) => ({ proposal_key: row.proposalKey,
        candidate_content_hash: row.effectiveContentHash, original_artifact_identity: row.originalArtifactIdentity,
        source_provenance_references: row.sourceProvenanceReferences, candidate_content: row.content,
        selection_status: "EFFECTIVE", staging_batch_id: bundle.batchId }));
      const insertedCandidates = await tx<Row[]>`INSERT INTO ${tx.unsafe(`${SCHEMA}.candidate_versions`)}
        (proposal_key,candidate_content_hash,original_artifact_identity,source_provenance_references,candidate_content,selection_status,staging_batch_id)
        SELECT r.proposal_key,r.candidate_content_hash,r.original_artifact_identity,r.source_provenance_references,r.candidate_content,
          r.selection_status,r.staging_batch_id
        FROM jsonb_to_recordset(${tx.json(candidateRows)}::jsonb) AS r(proposal_key text,candidate_content_hash text,
          original_artifact_identity jsonb,source_provenance_references jsonb,candidate_content jsonb,selection_status text,staging_batch_id text)
        RETURNING proposal_key`;
      if (insertedCandidates.length !== records.length) throw new Error("T22_CANDIDATE_INSERT_COUNT_MISMATCH");

      for (const row of records) {
        const [readback] = await tx<Row[]>`SELECT i.resolution_status,i.rights_status,trim(i.effective_content_hash) AS identity_hash,
            trim(i.staging_batch_id) AS identity_batch,d.editorial_status,d.rights_status AS draft_rights,
            trim(d.effective_content_hash) AS draft_hash,trim(d.batch_id) AS draft_batch,
            trim(cv.candidate_content_hash) AS candidate_hash,cv.selection_status,trim(cv.staging_batch_id) AS candidate_batch,cv.candidate_content
          FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d USING(proposal_key)
          JOIN ${tx.unsafe(`${SCHEMA}.candidate_versions`)} cv USING(proposal_key)
          WHERE i.proposal_key=${row.proposalKey}`;
        if (!readback || readback.resolution_status !== "EFFECTIVE" || readback.editorial_status !== "DRAFT"
          || readback.rights_status !== RIGHTS || readback.draft_rights !== RIGHTS
          || readback.identity_hash !== row.effectiveContentHash || readback.draft_hash !== row.effectiveContentHash
          || readback.candidate_hash !== row.effectiveContentHash || readback.selection_status !== "EFFECTIVE"
          || readback.identity_batch !== bundle.batchId || readback.draft_batch !== bundle.batchId || readback.candidate_batch !== bundle.batchId
          || sha(stable(readback.candidate_content)) !== row.effectiveContentHash
          || stable(readback.candidate_content) !== stable(row.content)) throw new Error(`T22_POST_WRITE_READBACK_MISMATCH:${row.proposalKey}`);
      }
      const countsAfter = await readStagingCounts(tx);
      if (countsAfter.identityCount !== BASELINE.identities + records.length
        || countsAfter.statuses.EFFECTIVE !== BASELINE.effective + records.length
        || countsAfter.statuses.PENDING_CONTENT_VALIDATION !== BASELINE.pendingContent
        || countsAfter.pendingVersion !== BASELINE.pendingVersion
        || countsAfter.effectiveIntegrity.effective_identities !== BASELINE.effective + records.length
        || countsAfter.effectiveIntegrity.effective_draft_rows !== BASELINE.effective + records.length
        || countsAfter.effectiveIntegrity.effective_hash_matches !== BASELINE.effective + records.length
        || countsAfter.effectiveIntegrity.rights_mismatches !== 0
        || countsAfter.media.assets !== countsBefore.media.assets || countsAfter.media.mappings !== countsBefore.media.mappings
        || countsAfter.media.rights !== countsBefore.media.rights
        || countsAfter.versions.multiple_selected_versions !== 0
        || countsAfter.versions.no_selected_version !== countsBefore.versions.no_selected_version) {
        throw new Error("T22_POST_WRITE_INTEGRITY_GATE_FAILED");
      }
      return { outcome: "APPLIED", synced: records.length, verified: records.length, countsBefore, countsAfter };
    });
  } finally { await sql.end({ timeout: 5 }); }
  const afterRuntime = await runtimeCounts();
  const runtimePreserved = stable(beforeRuntime) === stable(afterRuntime);
  console.log(JSON.stringify({ target: `${TARGET.projectId}/${TARGET.branchId}/${TARGET.databaseName}/${SCHEMA}`,
    outcome: applyResult.outcome, synced: applyResult.synced, verified: applyResult.verified,
    groups: 9, proposalIdentities: records.length, newSenseHashes: records.map((row) => ({ proposalKey: row.proposalKey, sha256: row.effectiveContentHash })),
    staging: applyResult.countsAfter ?? applyResult.counts,
    runtimePreserved, mediaPreserved: true,
    boundaries: { runtimeVocabularyWrites: false, learnerProgressWrites: false, reviewHistoryWrites: false,
      publicationStatusWrites: false, rightsChanged: false, mediaMetadataChanged: false, productionAccessed: false } }, null, 2));
  if (!runtimePreserved) throw new Error("RUNTIME_PRESERVATION_READBACK_DIFFERED");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "T22_DEVELOPMENT_SYNC_FAILED");
  process.exitCode = 1;
});
