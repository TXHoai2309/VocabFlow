import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection } from "./production-release-safety";
import { assertPostConnectIdentity, openSql } from "./db-core";

const expected = {
  projectId: "silent-sky-84582895",
  branchId: "br-cool-sea-a1ifkf95",
  database: "neondb",
  count: 7311,
  contentFingerprint: "9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367",
  statusCounts: { VERIFIED: 5402, REVIEW_REQUIRED: 397, UNRESOLVED: 1512 },
} as const;

type ArtifactResult = {
  proposalIdentity: string;
  vocabularyId: number;
  sourceContentHash: string;
  shortMeaningVi: string | null;
  sourceType: string | null;
  evidenceRef: string | null;
  confidence: string | null;
  validationStatus: "VERIFIED" | "REVIEW_REQUIRED" | "UNRESOLVED";
  reviewerIdentity: string | null;
  reviewedAt: string | null;
  reviewEvidence: string | null;
  artifactVersion: string;
};

type IdentityRow = { proposalIdentity: string; vocabularyId: number; sourceContentHash: string };

type OverlayRow = ArtifactResult & { vocabularyId: number };

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const stableJson = (value: unknown) => JSON.stringify(value);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Map across environments by stable identity and content hash, never by source numeric ID. */
export function mapResultsToProductionIdentities(
  sourceRows: Array<{ proposalIdentity: string; vocabularyId: number; sourceContentHash: string }>,
  results: ArtifactResult[],
  productionRows: IdentityRow[],
): OverlayRow[] {
  const sourceByIdentity = new Map(sourceRows.map((row) => [row.proposalIdentity, row]));
  const productionByIdentity = new Map(productionRows.map((row) => [row.proposalIdentity, row]));
  if (sourceByIdentity.size !== sourceRows.length || productionByIdentity.size !== productionRows.length) {
    throw new Error("DUPLICATE_STABLE_IDENTITY");
  }
  if (results.length !== sourceRows.length || productionRows.length !== sourceRows.length) {
    throw new Error("PRODUCTION_IDENTITY_COVERAGE_MISMATCH");
  }
  const resultIds = new Set<string>();
  const mapped: OverlayRow[] = [];
  for (const result of results) {
    if (resultIds.has(result.proposalIdentity)) throw new Error("DUPLICATE_ARTIFACT_IDENTITY");
    resultIds.add(result.proposalIdentity);
    const source = sourceByIdentity.get(result.proposalIdentity);
    const target = productionByIdentity.get(result.proposalIdentity);
    if (!source || !target) throw new Error("SOURCE_OR_PRODUCTION_IDENTITY_MISSING");
    if (source.vocabularyId !== result.vocabularyId || source.sourceContentHash !== result.sourceContentHash) {
      throw new Error("ARTIFACT_SOURCE_PIN_MISMATCH");
    }
    if (target.sourceContentHash !== result.sourceContentHash) throw new Error("PRODUCTION_CONTENT_HASH_MISMATCH");
    mapped.push({ ...result, vocabularyId: target.vocabularyId });
  }
  if (resultIds.size !== sourceByIdentity.size || resultIds.size !== productionByIdentity.size) {
    throw new Error("SOURCE_OR_PRODUCTION_IDENTITY_EXTRA");
  }
  return mapped.sort((a, b) => a.proposalIdentity.localeCompare(b.proposalIdentity));
}

async function readPinnedArtifact() {
  const artifactDir = path.isAbsolute(process.env.SHORT_MEANING_ARTIFACT_DIR ?? "")
    ? process.env.SHORT_MEANING_ARTIFACT_DIR!
    : path.resolve(repositoryRoot, process.env.SHORT_MEANING_ARTIFACT_DIR ?? "vocabflow-dataset/artifacts/short-meanings-v2-final-reviewed-v3");
  const manifest = JSON.parse(await readFile(path.join(artifactDir, "manifest.json"), "utf8"));
  const snapshot = JSON.parse(await readFile(path.join(artifactDir, "input-snapshot.json"), "utf8"));
  const resultsText = await readFile(path.join(artifactDir, "results.jsonl"), "utf8");
  const results = resultsText.trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line)) as ArtifactResult[];
  const snapshotBody = { ...snapshot };
  delete snapshotBody.snapshotFingerprint;
  if (manifest.target?.projectId !== expected.projectId || manifest.target?.branchId !== "br-cold-shadow-a17yg4k2"
    || manifest.target?.database !== expected.database || snapshot.target?.projectId !== expected.projectId
    || snapshot.target?.branchId !== "br-cold-shadow-a17yg4k2" || snapshot.target?.database !== expected.database) {
    throw new Error("ARTIFACT_SOURCE_TARGET_MISMATCH");
  }
  if (manifest.contentFingerprint !== expected.contentFingerprint || snapshot.contentFingerprint !== expected.contentFingerprint) {
    throw new Error("ARTIFACT_CONTENT_FINGERPRINT_MISMATCH");
  }
  if (manifest.rowCount !== expected.count || snapshot.rows?.length !== expected.count || results.length !== expected.count) {
    throw new Error("ARTIFACT_COHORT_COUNT_MISMATCH");
  }
  if (manifest.resultSha256 !== sha256(resultsText) || manifest.snapshotSha256 !== sha256(stableJson(snapshotBody))
    || manifest.snapshotFingerprint !== snapshot.snapshotFingerprint) {
    throw new Error("ARTIFACT_PIN_HASH_MISMATCH");
  }
  const statusCounts = { VERIFIED: 0, REVIEW_REQUIRED: 0, UNRESOLVED: 0 };
  const sourceRows = snapshot.rows.map((row: { proposalIdentity: string; vocabularyId: number; sourceContentHash: string }) => ({
    proposalIdentity: row.proposalIdentity,
    vocabularyId: Number(row.vocabularyId),
    sourceContentHash: row.sourceContentHash,
  }));
  for (const row of results) {
    if (!(row.validationStatus in statusCounts)) throw new Error("INVALID_GLOSS_STATUS");
    statusCounts[row.validationStatus] += 1;
    if (!/^[0-9a-f]{64}$/u.test(row.sourceContentHash) || !row.artifactVersion) throw new Error("INVALID_GLOSS_SOURCE_PIN");
    if (row.validationStatus === "VERIFIED" && (!row.shortMeaningVi?.trim() || !row.sourceType || !row.evidenceRef)) {
      throw new Error("VERIFIED_GLOSS_WITHOUT_EVIDENCE");
    }
    if (row.sourceType === "AI_DERIVED") throw new Error("AI_DERIVED_GLOSS_NOT_AUTHORIZED");
    if (row.validationStatus === "UNRESOLVED" && row.shortMeaningVi !== null) throw new Error("UNRESOLVED_GLOSS_HAS_VALUE");
    if (row.validationStatus === "REVIEW_REQUIRED" && !row.shortMeaningVi?.trim()) throw new Error("REVIEW_REQUIRED_GLOSS_MISSING");
  }
  for (const status of Object.keys(expected.statusCounts) as Array<keyof typeof expected.statusCounts>) {
    if (statusCounts[status] !== expected.statusCounts[status]) throw new Error("ARTIFACT_STATUS_COUNTS_MISMATCH");
  }
  return { sourceRows, results, statusCounts };
}

function equalDate(left: string | Date | null, right: string | null) {
  if (left === null || right === null) return left === right;
  return new Date(left).getTime() === new Date(right).getTime();
}

function assertOverlayMatchesArtifact(actual: Array<Record<string, unknown>>, expectedRows: OverlayRow[]) {
  if (actual.length !== expectedRows.length) throw new Error("OVERLAY_READBACK_ROW_COUNT_MISMATCH");
  const byIdentity = new Map(expectedRows.map((row) => [row.proposalIdentity, row]));
  const seen = new Set<string>();
  for (const row of actual) {
    const identity = String(row.proposal_identity);
    if (seen.has(identity)) throw new Error("DUPLICATE_OVERLAY_IDENTITY");
    seen.add(identity);
    const expectedRow = byIdentity.get(identity);
    if (!expectedRow || Number(row.vocabulary_id) !== expectedRow.vocabularyId
      || row.source_content_hash !== expectedRow.sourceContentHash
      || row.short_meaning_vi !== expectedRow.shortMeaningVi
      || row.source_type !== expectedRow.sourceType || row.evidence_ref !== expectedRow.evidenceRef
      || row.confidence !== expectedRow.confidence || row.validation_status !== expectedRow.validationStatus
      || row.reviewer_identity !== expectedRow.reviewerIdentity || !equalDate(row.reviewed_at as string | Date | null, expectedRow.reviewedAt)
      || row.review_evidence !== expectedRow.reviewEvidence || row.artifact_version !== expectedRow.artifactVersion) {
      throw new Error("OVERLAY_READBACK_CONTENT_MISMATCH");
    }
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const applyArgs = rawArgs.filter((arg) => arg === "--apply");
  if (applyArgs.length > 1) throw new Error("CLI_ARGUMENT_INVALID");
  const apply = applyArgs.length === 1;
  const options = parseProductionReleaseArgs(rawArgs.filter((arg) => arg !== "--apply"));
  const target = authorizeProductionRelease({ options, mode: apply ? "mutation" : "read-only", environment: process.env });
  if (target.branchId !== expected.branchId || target.projectId !== expected.projectId || target.databaseName !== expected.database) {
    throw new Error("PRODUCTION_TARGET_MISMATCH");
  }
  const connection = await resolveProductionConnection({ purpose: "migration", environment: process.env });
  const artifact = await readPinnedArtifact();
  const sql = openSql(connection.url);
  try {
    await assertPostConnectIdentity(sql, target);
    const result = await sql.begin(apply ? "isolation level serializable" : "read only", async (tx) => {
      if (!apply) await tx`SET TRANSACTION READ ONLY`;
      const [db] = await tx`select current_database() as database_name, to_regclass('vocabflow_app.master_v2_short_meanings') is not null as overlay_exists`;
      if (db.database_name !== expected.database) throw new Error("PRODUCTION_DATABASE_NAME_MISMATCH");
      if (!db.overlay_exists) throw new Error("PRODUCTION_SHORT_MEANING_MIGRATION_REQUIRED");

      const productionRows = await tx<IdentityRow[]>`
        select p.proposal_key as "proposalIdentity", v.id as "vocabularyId", p.content_sha256 as "sourceContentHash"
        from vocabflow_app.vocabularies v
        join vocabflow_app.master_v2_development_projections p on p.vocabulary_id = v.id
        where v.enabled = true and v.source_dataset = 'VOCABFLOW_MASTER_V2_DEV'
      `;
      if (productionRows.length !== expected.count) throw new Error("PRODUCTION_SENSE_COUNT_MISMATCH");
      const mapped = mapResultsToProductionIdentities(artifact.sourceRows, artifact.results, productionRows.map((row) => ({
        ...row, vocabularyId: Number(row.vocabularyId),
      })));
      const liveFingerprint = sha256(stableJson(productionRows
        .map((row) => [row.proposalIdentity, row.sourceContentHash])
        .sort((a, b) => a[0]!.localeCompare(b[0]!))));
      if (liveFingerprint !== expected.contentFingerprint) throw new Error("PRODUCTION_CONTENT_FINGERPRINT_MISMATCH");

      const existing = await tx<Record<string, unknown>[]>`
        select vocabulary_id, proposal_identity, source_content_hash, short_meaning_vi, source_type, evidence_ref,
          confidence, validation_status, reviewer_identity, reviewed_at, review_evidence, artifact_version
        from vocabflow_app.master_v2_short_meanings order by proposal_identity
      `;
      const desiredByIdentity = new Map(mapped.map((row) => [row.proposalIdentity, row]));
      for (const row of existing) {
        const desired = desiredByIdentity.get(String(row.proposal_identity));
        if (!desired || Number(row.vocabulary_id) !== desired.vocabularyId || row.source_content_hash !== desired.sourceContentHash) {
          throw new Error("EXISTING_PRODUCTION_OVERLAY_CONFLICT");
        }
      }
      if (!apply) return { inserted: 0, updated: 0, rowsBefore: existing.length, rowsAfter: existing.length, mapped: mapped.length,
        counts: artifact.statusCounts, replay: null, samples: [] as Array<Record<string, unknown>> };

      await tx`select pg_advisory_xact_lock(89421919)`;
      let inserted = 0;
      let updated = 0;
      for (let offset = 0; offset < mapped.length; offset += 250) {
        const batch = mapped.slice(offset, offset + 250).map((row) => ({
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
          artifact_version: row.artifactVersion,
        }));
        const changed = await tx`
          insert into vocabflow_app.master_v2_short_meanings (
            vocabulary_id, proposal_identity, source_content_hash, short_meaning_vi, source_type, evidence_ref,
            confidence, validation_status, reviewer_identity, reviewed_at, review_evidence, artifact_version
          )
          select x.vocabulary_id, x.proposal_identity, x.source_content_hash, x.short_meaning_vi, x.source_type,
            x.evidence_ref, x.confidence, x.validation_status, x.reviewer_identity, x.reviewed_at::timestamptz,
            x.review_evidence, x.artifact_version
          from jsonb_to_recordset(${tx.json(batch)}::jsonb) as x(
            vocabulary_id integer, proposal_identity text, source_content_hash text, short_meaning_vi text,
            source_type text, evidence_ref text, confidence text, validation_status text, reviewer_identity text,
            reviewed_at text, review_evidence text, artifact_version text
          )
          on conflict (vocabulary_id) do update set
            proposal_identity = excluded.proposal_identity, source_content_hash = excluded.source_content_hash,
            short_meaning_vi = excluded.short_meaning_vi, source_type = excluded.source_type,
            evidence_ref = excluded.evidence_ref, confidence = excluded.confidence,
            validation_status = excluded.validation_status, reviewer_identity = excluded.reviewer_identity,
            reviewed_at = excluded.reviewed_at, review_evidence = excluded.review_evidence,
            artifact_version = excluded.artifact_version, updated_at = now()
          where (master_v2_short_meanings.proposal_identity, master_v2_short_meanings.source_content_hash,
            master_v2_short_meanings.short_meaning_vi, master_v2_short_meanings.source_type,
            master_v2_short_meanings.evidence_ref, master_v2_short_meanings.confidence,
            master_v2_short_meanings.validation_status, master_v2_short_meanings.reviewer_identity,
            master_v2_short_meanings.reviewed_at, master_v2_short_meanings.review_evidence,
            master_v2_short_meanings.artifact_version)
          is distinct from (excluded.proposal_identity, excluded.source_content_hash, excluded.short_meaning_vi,
            excluded.source_type, excluded.evidence_ref, excluded.confidence, excluded.validation_status,
            excluded.reviewer_identity, excluded.reviewed_at, excluded.review_evidence, excluded.artifact_version)
          returning (xmax = 0) as inserted
        `;
        inserted += changed.filter((row) => row.inserted).length;
        updated += changed.filter((row) => !row.inserted).length;
      }
      const actual = await tx<Record<string, unknown>[]>`
        select vocabulary_id, proposal_identity, source_content_hash, short_meaning_vi, source_type, evidence_ref,
          confidence, validation_status, reviewer_identity, reviewed_at, review_evidence, artifact_version
        from vocabflow_app.master_v2_short_meanings order by proposal_identity
      `;
      assertOverlayMatchesArtifact(actual, mapped);
      const counts = Object.fromEntries((await tx`
        select validation_status, count(*)::int as count from vocabflow_app.master_v2_short_meanings group by validation_status
      `).map((row) => [row.validation_status, row.count]));
      if (actual.length !== expected.count || counts.VERIFIED !== expected.statusCounts.VERIFIED
        || counts.REVIEW_REQUIRED !== expected.statusCounts.REVIEW_REQUIRED || counts.UNRESOLVED !== expected.statusCounts.UNRESOLVED) {
        throw new Error("PRODUCTION_OVERLAY_STATUS_READBACK_FAILED");
      }
      const [orphan] = await tx`
        select count(*)::int as count from vocabflow_app.master_v2_short_meanings sm
        left join vocabflow_app.vocabularies v on v.id = sm.vocabulary_id
        left join vocabflow_app.master_v2_development_projections p on p.vocabulary_id = v.id
        where v.id is null or p.proposal_key is distinct from sm.proposal_identity
          or p.content_sha256 is distinct from sm.source_content_hash or v.source_dataset <> 'VOCABFLOW_MASTER_V2_DEV'
      `;
      if (orphan.count !== 0) throw new Error("PRODUCTION_OVERLAY_ORPHAN_OR_HASH_MISMATCH");
      const samples = await tx`
        select v.word, p.part_of_speech, p.proposal_key as proposal_identity, sm.short_meaning_vi,
          sm.validation_status, p.content_sha256
        from vocabflow_app.master_v2_short_meanings sm
        join vocabflow_app.vocabularies v on v.id = sm.vocabulary_id
        join vocabflow_app.master_v2_development_projections p on p.vocabulary_id = v.id
        where lower(v.word) in ('banana','age','about') order by v.word, p.part_of_speech, p.proposal_key
      `;
      return { inserted, updated, rowsBefore: existing.length, rowsAfter: actual.length, mapped: mapped.length,
        counts, replay: inserted === 0 && updated === 0, samples };
    });
    console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", target: expected, ...result }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    console.error(/^[A-Z][A-Z0-9_]{2,79}$/u.test(message) ? message : "SHORT_MEANINGS_V2_PRODUCTION_SYNC_FAILED");
    process.exitCode = 1;
  });
}
