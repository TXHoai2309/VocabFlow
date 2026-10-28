import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import postgres from "postgres";
import {
  EXAMPLE_TEXT_NORMALIZATION,
  REVIEW_CONTRACT_VERSION,
  buildLexemePronunciationProfiles,
  buildReadinessSets,
  classifyExampleText,
  isIdempotentReplay,
  plainSourceText,
  validateMappingDecision,
  validateRightsDecision,
} from "./english-vocabulary-4600-media-review-contract.mjs";
import { buildSenseMediaPreview } from "./english-vocabulary-4600-dev-media-resolver.mjs";

const execFile = promisify(execFileCallback);
const ROOT = process.cwd();
const WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2");
const TARGET = Object.freeze({ projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", endpointId: "ep-small-shadow-b3ny4993", database: "neondb", schema: "vocabflow_editorial_staging" });
const HOST = "127.0.0.1";
const PORT = 3004;
const PAGE_SIZE = 20;
const PAGE_MAX = 500;
const MANIFEST_VERSION = "english-vocabulary-4600-media-v2.0.0";
const MANIFEST_PATH = path.join(WORKSPACE, "media-manifest-v2.json");
const BUNDLE_PATH = path.join(WORKSPACE, "media-mapping-bundle-v1.json");
const RIGHTS_PATH = path.join(WORKSPACE, "media-rights-ledger-v1.json");
const SNAPSHOT_PATH = path.join(WORKSPACE, "current-effective-staging-snapshot-v1.json");
const INVENTORY_PATH = path.join(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/vocab4600-normalized-inventory.json");

async function readOnly(sql, run) {
  return sql.begin(async (tx) => {
    await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
    return run(tx);
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function requireLocalDevelopment() {
  if (process.env.VOCABFLOW_MEDIA_REVIEW !== "1") throw new Error("MEDIA_REVIEW_LOCAL_DEVELOPMENT_OPT_IN_REQUIRED");
  if (process.env.VOCABFLOW_ENV !== "development" || process.env.DATABASE_ENV !== "development"
    || process.env.EXECUTION_CONTEXT !== "local-development" || process.env.VERCEL_ENV) throw new Error("MEDIA_REVIEW_LOCAL_DEVELOPMENT_ONLY");
  const bootstrapUrl = process.env.BOOTSTRAP_DATABASE_URL;
  const migrationUrl = process.env.DATABASE_MIGRATION_URL;
  const apiKey = process.env.NEON_API_KEY;
  if (!bootstrapUrl || !migrationUrl || !apiKey) throw new Error("MEDIA_REVIEW_DEVELOPMENT_CONFIGURATION_MISSING");
  const bootstrap = new URL(bootstrapUrl);
  const migration = new URL(migrationUrl);
  const endpoint = (url) => url.hostname.split(".")[0]?.replace(/-pooler$/u, "");
  const role = (url) => decodeURIComponent(url.username);
  if (endpoint(bootstrap) !== TARGET.endpointId || endpoint(migration) !== TARGET.endpointId
    || bootstrap.pathname.slice(1) !== TARGET.database || migration.pathname.slice(1) !== TARGET.database
    || role(bootstrap) !== "vocabflow_identity_bootstrap" || role(migration) !== "vocabflow_migration") {
    throw new Error("MEDIA_REVIEW_DATABASE_TARGET_MISMATCH");
  }
  return { bootstrapUrl, migrationUrl, apiKey };
}

function loadPinnedInputs() {
  const manifestRaw = readFileSync(MANIFEST_PATH);
  const bundleRaw = readFileSync(BUNDLE_PATH);
  const rightsRaw = readFileSync(RIGHTS_PATH);
  const snapshotRaw = readFileSync(SNAPSHOT_PATH);
  const manifest = JSON.parse(manifestRaw.toString("utf8"));
  const bundle = JSON.parse(bundleRaw.toString("utf8"));
  const rightsLedger = JSON.parse(rightsRaw.toString("utf8"));
  const snapshot = JSON.parse(snapshotRaw.toString("utf8"));
  const inventory = readJson(INVENTORY_PATH);
  const manifestSha = sha256(manifestRaw);
  const snapshotSha = sha256(snapshotRaw);
  const apkgPath = manifest.source?.apkgPath;
  if (manifest.manifestVersion !== MANIFEST_VERSION || manifest.source?.sourceId !== "ENGLISH_VOCAB_4600"
    || manifest.assets?.length !== 13977 || manifest.mappings?.length !== 14012
    || manifestSha !== bundle.source?.sourceManifestSha256 || snapshotSha !== bundle.target?.snapshotSha256
    || snapshot.snapshotVersion !== "current-effective-staging-snapshot-v1"
    || snapshot.summary?.effectiveSenses !== 5616 || snapshot.summary?.identityRows !== 7451
    || bundle.target?.effectiveSenseCount !== 5616 || bundle.target?.snapshotFingerprint !== snapshot.snapshotFingerprint
    || bundle.target?.projectId !== TARGET.projectId || bundle.target?.branchId !== TARGET.branchId || bundle.target?.databaseName !== TARGET.database
    || rightsLedger.sourceApkgSha256 !== manifest.source.apkgSha256 || rightsLedger.sourceManifestSha256 !== manifestSha
    || !path.isAbsolute(apkgPath) || apkgPath.toLowerCase() !== "d:\\hoctienganh\\4600 english vocab.apkg".toLowerCase()
    || !existsSync(apkgPath) || statSync(apkgPath).size !== manifest.source.apkgByteLength
    || inventory.source?.sourceId !== "ENGLISH_VOCAB_4600" || inventory.records?.length !== 4673) {
    throw new Error("MEDIA_REVIEW_SOURCE_OR_SNAPSHOT_PIN_FAILURE");
  }
  const assetsByHash = new Map(manifest.assets.map((row) => [row.media_sha256, row]));
  const rightsByHash = new Map(rightsLedger.assets.map((row) => [row.mediaSha256, row]));
  const recordsById = new Map(inventory.records.map((row) => [String(row.sourceRecordId), row]));
  const sensesByProposal = new Map(snapshot.effectiveSenses.map((row) => [row.proposalKey, row]));
  const mappingsByKey = new Map(bundle.mappings.map((row) => [row.mappingKey, row]));
  if (assetsByHash.size !== 13977 || mappingsByKey.size !== 14012 || sensesByProposal.size !== 5616 || rightsByHash.size !== 13977) {
    throw new Error("MEDIA_REVIEW_PINNED_ARTIFACT_COUNT_FAILURE");
  }
  for (const row of bundle.mappings) {
    const note = row.sourceNoteIdentity;
    const source = recordsById.get(String(note?.sourceRecordId));
    if (!source || source.sourceNoteGuid !== note.sourceNoteGuid || source.recordEvidenceSha256 !== note.recordEvidenceSha256
      || !assetsByHash.has(row.mediaSha256) || !rightsByHash.has(row.mediaSha256)) throw new Error("MEDIA_REVIEW_SOURCE_NOTE_OR_HASH_PIN_FAILURE");
  }
  const lexemePronunciationProfiles = buildLexemePronunciationProfiles(
    bundle.mappings.filter((row) => row.mediaKind === "WORD_PRONUNCIATION_AUDIO"), recordsById);
  return { manifest, bundle, rightsLedger, snapshot, recordsById, sensesByProposal, assetsByHash, rightsByHash, mappingsByKey,
    lexemePronunciationProfiles,
    apkgPath, manifestSha, snapshotSha, apkgSha: manifest.source.apkgSha256,
    groupFingerprints: new Map(rightsLedger.evidenceGroups.map((group) => [group.evidenceGroupId,
      sha256(stable(rightsLedger.assets.filter((asset) => asset.evidenceGroupId === group.evidenceGroupId).map((asset) => asset.mediaSha256).sort()))])),
    groupSizes: new Map(rightsLedger.evidenceGroups.map((group) => [group.evidenceGroupId,
      rightsLedger.assets.filter((asset) => asset.evidenceGroupId === group.evidenceGroupId).length])) };
}

async function verifyNeonTarget(apiKey) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const branchResponse = await fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/branches/${TARGET.branchId}`, { headers });
  if (!branchResponse.ok) throw new Error("MEDIA_REVIEW_NEON_BRANCH_VERIFICATION_FAILED");
  const branch = await branchResponse.json();
  if (branch?.branch?.project_id !== TARGET.projectId || branch?.branch?.id !== TARGET.branchId) throw new Error("MEDIA_REVIEW_NEON_BRANCH_MISMATCH");
  const endpointsResponse = await fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/endpoints`, { headers });
  if (!endpointsResponse.ok) throw new Error("MEDIA_REVIEW_NEON_ENDPOINT_VERIFICATION_FAILED");
  const endpoints = await endpointsResponse.json();
  const endpoint = (endpoints?.endpoints ?? []).find((item) => item.id === TARGET.endpointId);
  if (!endpoint || endpoint.branch_id !== TARGET.branchId || endpoint.type !== "read_write") throw new Error("MEDIA_REVIEW_NEON_ENDPOINT_MISMATCH");
}

function displaySource(record) {
  const fields = record?.sourceFields ?? {};
  return {
    word: plainSourceText(fields.Word),
    ipa: plainSourceText(fields.IPA),
    pos: plainSourceText(fields.PoS),
    meaning: plainSourceText(fields.Meaning),
    example: plainSourceText(fields.Example),
  };
}

function targetCandidates(mapping, pins) {
  const evidence = mapping.mappingEvidence ?? {};
  const candidates = [mapping.targetSenseProposalKey,
    ...(evidence.candidateProposalKeysPendingSelection ?? []),
    ...(evidence.effectiveSourceEvidenceProposalKeys ?? []),
    ...(evidence.mismatchCandidateProposalKeys ?? [])].filter(Boolean);
  return [...new Set(candidates)].map((proposalKey) => pins.sensesByProposal.get(proposalKey)).filter(Boolean);
}

function targetView(sense) {
  const content = sense.content;
  return {
    proposalKey: sense.proposalKey,
    headword: content.headword,
    partOfSpeech: content.partOfSpeech,
    meaningVi: content.meaningVi,
    definitionEn: content.definitionEn,
    contentFingerprint: sense.contentHash,
    editorialStatus: sense.editorialStatus,
    examples: (content.examples ?? []).map((example, index) => ({
      exampleKey: `${sense.proposalKey}:example-${index + 1}`,
      index,
      en: example.en ?? "",
      vi: example.vi ?? "",
    })),
  };
}

function compareExampleCandidates(mapping, pins) {
  const sourceRecord = pins.recordsById.get(String(mapping.sourceNoteIdentity.sourceRecordId));
  const sourceText = sourceRecord?.sourceFields?.Example;
  const candidates = targetCandidates(mapping, pins);
  const comparisons = candidates.flatMap((sense) => (sense.content.examples ?? []).map((example, index) => ({
    proposalKey: sense.proposalKey,
    exampleKey: `${sense.proposalKey}:example-${index + 1}`,
    outcome: classifyExampleText(sourceText, example.en),
  })));
  const matched = comparisons.filter((item) => item.outcome === "EXACT_TEXT_MATCH" || item.outcome === "SAFE_NORMALIZED_MATCH");
  if (matched.length === 1) return { classification: matched[0].outcome, target: matched[0] };
  if (matched.length > 1) return { classification: "UNRESOLVED", target: null };
  return { classification: candidates.length > 0 ? "DIFFERENT_SENTENCE" : "UNRESOLVED", target: null };
}

function effectiveDecisionMap(mappingRows, rightsRows, pins) {
  const mappings = new Map();
  for (const row of mappingRows) {
    const current = mappings.get(row.mapping_key);
    if (!current || new Date(row.reviewed_at).getTime() > new Date(current.reviewed_at).getTime()) mappings.set(row.mapping_key, row);
  }
  const asset = new Map();
  const group = new Map();
  for (const row of rightsRows) {
    const target = row.media_sha256 ? asset : group;
    const key = row.media_sha256 ?? row.evidence_group_id;
    const current = target.get(key);
    if (!current || new Date(row.reviewed_at).getTime() > new Date(current.reviewed_at).getTime()) target.set(key, row);
  }
  return { mappings, asset, group };
}

function objectValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Keep the hash-pinned local byte resolver available when the historical US-56
 * review snapshot is stale. This mode is read-only and exposes only hashes
 * already linked from current, content-PASS Development V2 projections.
 */
async function startDevelopmentMediaResolver(env, pins) {
  const runtimeUrl = process.env.DATABASE_URL;
  if (!runtimeUrl) throw new Error("MEDIA_RESOLVER_RUNTIME_DATABASE_REQUIRED");
  const parsedRuntimeUrl = new URL(runtimeUrl);
  const runtimeEndpoint = parsedRuntimeUrl.hostname.split(".")[0]?.replace(/-pooler$/u, "");
  if (runtimeEndpoint !== TARGET.endpointId || parsedRuntimeUrl.pathname.slice(1) !== TARGET.database
    || decodeURIComponent(parsedRuntimeUrl.username) !== "vocabflow_runtime"
    || !parsedRuntimeUrl.hostname.endsWith(".neon.tech")) throw new Error("MEDIA_RESOLVER_DATABASE_TARGET_MISMATCH");
  await verifyNeonTarget(env.apiKey);

  const runtimeSql = postgres(runtimeUrl, { max: 1, idle_timeout: 10, connect_timeout: 10, prepare: false, onnotice: () => undefined });
  let allowedAssets;
  try {
    const readback = await readOnly(runtimeSql, async (tx) => ({
      identity: (await tx`SELECT current_database() AS database_name, current_user AS role_name`)[0],
      rows: await tx`SELECT p.content_review_decision, p.editorial_status, p.rights_status, p.development_media
        FROM vocabflow_app.master_v2_development_projections p
        JOIN vocabflow_app.vocabularies v ON v.id = p.vocabulary_id
        WHERE v.source_dataset = 'VOCABFLOW_MASTER_V2_DEV'
        ORDER BY p.proposal_key`
    }));
    if (readback.identity?.database_name !== TARGET.database || readback.identity?.role_name !== "vocabflow_runtime"
      || readback.rows.length !== 7311) throw new Error("MEDIA_RESOLVER_DEVELOPMENT_PROJECTION_CHECK_FAILED");

    allowedAssets = new Map();
    for (const row of readback.rows) {
      if (row.content_review_decision !== "PASS" || row.editorial_status !== "DRAFT"
        || row.rights_status !== "UNKNOWN_REVIEW_REQUIRED") continue;
      const media = objectValue(row.development_media) ?? {};
      for (const [collection, kind] of [["images", "image"], ["wordAudio", "audio"], ["exampleAudio", "audio"]]) {
        for (const itemValue of arrayValue(media[collection])) {
          const item = objectValue(itemValue);
          const hash = item?.mediaSha256;
          if (typeof hash !== "string" || !/^[0-9a-f]{64}$/u.test(hash)
            || item?.url !== `/api/dev/media-review/assets/${hash}/preview`
            || item?.rightsStatus !== "UNKNOWN_REVIEW_REQUIRED") continue;
          const asset = pins.assetsByHash.get(hash);
          const mime = asset?.detected_mime_type;
          const typeMatches = kind === "image" ? mime?.startsWith("image/") === true : mime === "audio/mpeg";
          const entry = asset?.source_file_identities?.find((file) => /^\d+$/u.test(String(file.archiveEntry ?? "")))?.archiveEntry;
          if (!asset || !typeMatches || !entry || !item.sourceNoteIdentity) continue;
          allowedAssets.set(hash, { asset, entry });
        }
      }
    }
    if (allowedAssets.size === 0) throw new Error("MEDIA_RESOLVER_NO_LINKED_DEVELOPMENT_ASSETS");
  } catch (error) {
    await runtimeSql.end({ timeout: 2 });
    throw error;
  }

  const isLocalRequest = (c) => {
    const host = (c.req.header("host") ?? "").split(":")[0].toLowerCase();
    const origin = c.req.header("origin");
    return host === HOST && (!origin || origin === "http://127.0.0.1:5173");
  };
  const app = new Hono();
  app.get("/api/dev/media-review/health", (c) => isLocalRequest(c)
    ? c.json({ mode: "DEVELOPMENT_MEDIA_RESOLVER_ONLY", linkedAssets: allowedAssets.size, rightsStatus: "UNKNOWN_REVIEW_REQUIRED" }, 200,
      { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" })
    : c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" }));
  app.get("/api/dev/media-review/assets/:sha256/preview", async (c) => {
    if (!isLocalRequest(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const hash = c.req.param("sha256");
    const pinned = allowedAssets.get(hash);
    if (!pinned || !/^[0-9a-f]{64}$/u.test(hash)) return c.json({ message: "Không tìm thấy media liên kết với V2 Development." }, 404,
      { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    try {
      const python = process.env.PYTHON ?? "python";
      const helper = path.join(ROOT, "scripts/read-english-vocabulary-4600-media-preview.py");
      const result = await execFile(python, [helper, pins.apkgPath, String(pinned.entry), hash], {
        encoding: "buffer", maxBuffer: 40 * 1024 * 1024, windowsHide: true
      });
      const mime = pinned.asset.detected_mime_type;
      if (sha256(result.stdout) !== hash) return c.json({ message: "Media preview không khớp SHA256 đã pin." }, 409,
        { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      return new Response(result.stdout, { status: 200, headers: {
        "Content-Type": mime, "Content-Length": String(result.stdout.length), "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox"
      } });
    } catch {
      return c.json({ message: "Không thể đọc media từ APKG đã pin hoặc SHA256 không khớp." }, 409,
        { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    }
  });
  app.all("*", (c) => c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" }));
  const server = serve({ fetch: app.fetch, hostname: HOST, port: PORT });
  server.on("close", () => { void runtimeSql.end({ timeout: 2 }); });
  process.stdout.write(`Development hash-pinned media resolver listening on http://${HOST}:${PORT}; linked assets ${allowedAssets.size}; no review/write endpoints.\n`);
}

async function main() {
  const env = requireLocalDevelopment();
  const pins = loadPinnedInputs();
  if (process.env.VOCABFLOW_MEDIA_RESOLVER_ONLY === "1") {
    await startDevelopmentMediaResolver(env, pins);
    return;
  }
  await verifyNeonTarget(env.apiKey);
  const dbOptions = { max: 1, idle_timeout: 10, connect_timeout: 10, prepare: false, onnotice: () => undefined };
  const bootstrapSql = postgres(env.bootstrapUrl, dbOptions);
  const migrationSql = postgres(env.migrationUrl, dbOptions);
  const bootstrapIdentity = await readOnly(bootstrapSql, async (tx) => ({
    identity: (await tx`SELECT current_database() AS database_name, current_user AS role_name,
      current_setting('transaction_read_only') AS read_only,
      (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
      (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id,
      has_schema_privilege('vocabflow_runtime', ${TARGET.schema}, 'USAGE') AS runtime_usage,
      has_schema_privilege('vocabflow_runtime', ${TARGET.schema}, 'CREATE') AS runtime_create`)[0],
    statuses: await tx`SELECT resolution_status, count(*)::int AS count FROM ${tx.unsafe(`${TARGET.schema}.identity_registry`)} GROUP BY resolution_status`,
    identities: await tx`SELECT proposal_key, source_group_key, resolution_status, trim(COALESCE(effective_content_hash, '')) AS effective_content_hash,
      trim(staging_batch_id) AS staging_batch_id, source_provenance FROM ${tx.unsafe(`${TARGET.schema}.identity_registry`)} ORDER BY proposal_key`,
    senses: await tx`SELECT i.proposal_key, i.effective_content_hash, d.effective_content_hash AS draft_content_hash, d.editorial_status
      FROM ${tx.unsafe(`${TARGET.schema}.identity_registry`)} i
      JOIN ${tx.unsafe(`${TARGET.schema}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
      WHERE i.resolution_status = 'EFFECTIVE' ORDER BY i.proposal_key`,
    batches: await tx`SELECT ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count,
      count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE')::int AS effective_draft_rows,
      count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE' AND d.effective_content_hash = i.effective_content_hash)::int AS effective_hash_matches
      FROM ${tx.unsafe(`${TARGET.schema}.import_batches`)} ib
      LEFT JOIN ${tx.unsafe(`${TARGET.schema}.draft_proposals`)} d ON trim(d.batch_id) = trim(ib.batch_id)
      LEFT JOIN ${tx.unsafe(`${TARGET.schema}.identity_registry`)} i ON i.proposal_key = d.proposal_key
      GROUP BY ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count ORDER BY ib.batch_id`,
    versions: (await tx`SELECT count(*)::int AS effective_senses,
      count(*) FILTER (WHERE selected.effective_candidate_count = 1)::int AS one_selected_candidate_version,
      count(*) FILTER (WHERE selected.effective_candidate_count = 0)::int AS no_candidate_version_row,
      count(*) FILTER (WHERE selected.effective_candidate_count > 1)::int AS multiple_candidate_versions
      FROM ${tx.unsafe(`${TARGET.schema}.identity_registry`)} i
      JOIN ${tx.unsafe(`${TARGET.schema}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
      LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE cv.selection_status = 'EFFECTIVE'
        AND trim(cv.candidate_content_hash) = trim(i.effective_content_hash)) AS effective_candidate_count
        FROM ${tx.unsafe(`${TARGET.schema}.candidate_versions`)} cv WHERE cv.proposal_key = i.proposal_key) selected ON true
      WHERE i.resolution_status = 'EFFECTIVE'`)[0],
    tables: (await tx`SELECT
      (SELECT count(*)::int FROM ${tx.unsafe(`${TARGET.schema}.media_assets_v2`)} WHERE manifest_version = ${MANIFEST_VERSION}) AS assets,
      (SELECT count(*)::int FROM ${tx.unsafe(`${TARGET.schema}.media_mappings_v2`)} WHERE manifest_version = ${MANIFEST_VERSION}) AS mappings,
      (SELECT count(*)::int FROM ${tx.unsafe(`${TARGET.schema}.media_rights_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}) AS rights,
      to_regclass(${`${TARGET.schema}.media_mapping_review_events_v1`})::text AS mapping_review_table,
      to_regclass(${`${TARGET.schema}.media_rights_review_events_v1`})::text AS rights_review_table`)[0],
  }));
  const migrationIdentity = await migrationSql`SELECT current_database() AS database_name, current_user AS role_name, current_setting('transaction_read_only') AS read_only,
    has_table_privilege(current_user, ${`${TARGET.schema}.media_mapping_review_events_v1`}, 'SELECT') AS mapping_select,
    has_table_privilege(current_user, ${`${TARGET.schema}.media_mapping_review_events_v1`}, 'INSERT') AS mapping_insert,
    has_table_privilege(current_user, ${`${TARGET.schema}.media_mapping_review_events_v1`}, 'UPDATE') AS mapping_update,
    has_table_privilege(current_user, ${`${TARGET.schema}.media_rights_review_events_v1`}, 'SELECT') AS rights_select,
    has_table_privilege(current_user, ${`${TARGET.schema}.media_rights_review_events_v1`}, 'INSERT') AS rights_insert,
    has_table_privilege(current_user, ${`${TARGET.schema}.media_rights_review_events_v1`}, 'UPDATE') AS rights_update`;
  const state = await readOnly(bootstrapSql, async (tx) => ({
    mappings: await tx`SELECT mapping_key, media_sha256, media_kind, outcome, target_lexeme_identity,
      target_sense_proposal_key, target_example_key, target_content_fingerprint, target_snapshot_fingerprint,
      reviewer_identity, reviewed_at::text AS reviewed_at, evidence
      FROM ${tx.unsafe(`${TARGET.schema}.media_mapping_review_events_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}`,
    rights: await tx`SELECT idempotency_key, event_sha256, manifest_version, media_sha256, evidence_group_id, group_assets_fingerprint,
      rights_status, evidence_type, evidence_url, rights_holder, intended_use, reviewer_note, reviewer_identity,
      reviewed_at::text AS reviewed_at
      FROM ${tx.unsafe(`${TARGET.schema}.media_rights_review_events_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}`,
  }));
  const identity = bootstrapIdentity.identity;
  const migration = migrationIdentity[0];
  const tables = bootstrapIdentity.tables;
  if (identity?.database_name !== TARGET.database || identity.role_name !== "vocabflow_identity_bootstrap" || identity.read_only !== "on"
    || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId || identity.runtime_usage !== false || identity.runtime_create !== false
    || migration?.database_name !== TARGET.database || migration.role_name !== "vocabflow_migration" || migration.read_only !== "off"
    || migration.mapping_select !== true || migration.mapping_insert !== true || migration.mapping_update !== false
    || migration.rights_select !== true || migration.rights_insert !== true || migration.rights_update !== false
    || tables?.assets !== 13977 || tables?.mappings !== 14012 || tables?.rights !== 13977
    || !tables.mapping_review_table || !tables.rights_review_table) throw new Error("MEDIA_REVIEW_DEVELOPMENT_STAGING_PREFLIGHT_FAILED");
  const counts = Object.fromEntries(bootstrapIdentity.statuses.map((row) => [row.resolution_status, Number(row.count)]));
  if (counts.EFFECTIVE !== 5616 || Object.values(counts).reduce((sum, count) => sum + count, 0) !== 7451) throw new Error("MEDIA_REVIEW_EFFECTIVE_TARGET_COUNT_MISMATCH");
  const effectiveByKey = new Map(pins.snapshot.effectiveSenses.map((row) => [row.proposalKey, row]));
  const pendingByKey = new Map(pins.snapshot.nonEffectiveIdentities.map((row) => [row.proposalKey, row]));
  if (bootstrapIdentity.identities.length !== 7451) throw new Error("MEDIA_REVIEW_PROPOSAL_IDENTITY_SNAPSHOT_MISMATCH");
  for (const row of bootstrapIdentity.identities) {
    const key = String(row.proposal_key);
    if (row.resolution_status === "EFFECTIVE") {
      const expected = effectiveByKey.get(key);
      if (!expected || row.source_group_key !== expected.sourceGroupKey || row.effective_content_hash !== expected.contentHash
        || stable(row.source_provenance) !== stable(expected.identitySourceProvenance)) {
        throw new Error("MEDIA_REVIEW_PROPOSAL_IDENTITY_SNAPSHOT_MISMATCH");
      }
    } else {
      const expected = pendingByKey.get(key);
      if (!expected || row.source_group_key !== expected.sourceGroupKey || row.resolution_status !== expected.resolutionStatus
        || row.effective_content_hash !== (expected.effectiveContentHash ?? "") || row.staging_batch_id !== expected.stagingBatchId
        || stable(row.source_provenance) !== stable(expected.sourceProvenance)) {
        throw new Error("MEDIA_REVIEW_PROPOSAL_IDENTITY_SNAPSHOT_MISMATCH");
      }
    }
  }
  const batchLineage = bootstrapIdentity.batches.map((row) => ({ batchId: row.batch_id.trim(), bundleSha256: row.bundle_sha256.trim(),
    sourceFingerprint: row.source_fingerprint.trim(), completeness: row.completeness, groupCount: Number(row.group_count),
    proposalCount: Number(row.proposal_count), effectiveDraftRows: Number(row.effective_draft_rows),
    effectiveContentHashMatches: Number(row.effective_hash_matches) })).sort((left, right) => left.batchId.localeCompare(right.batchId));
  if (stable(batchLineage) !== stable(pins.snapshot.importBatchLineage)) throw new Error("MEDIA_REVIEW_CONTENT_RECOVERY_BATCH_LINEAGE_MISMATCH");
  const versionIntegrity = bootstrapIdentity.versions;
  if (versionIntegrity.effective_senses !== 5616 || versionIntegrity.one_selected_candidate_version !== 5043
    || versionIntegrity.no_candidate_version_row !== 573 || versionIntegrity.multiple_candidate_versions !== 0) {
    throw new Error("MEDIA_REVIEW_CURRENT_EFFECTIVE_VERSION_INVARIANT_MISMATCH");
  }
  const actualSenseRows = bootstrapIdentity.senses;
  if (actualSenseRows.length !== 5616) throw new Error("MEDIA_REVIEW_EFFECTIVE_TARGET_ROWS_MISMATCH");
  for (const row of actualSenseRows) {
    const pinned = pins.sensesByProposal.get(row.proposal_key);
    if (!pinned || row.editorial_status !== "DRAFT" || row.effective_content_hash !== pinned.contentHash
      || row.draft_content_hash !== pinned.draftContentHash || pinned.contentHash !== pinned.draftContentHash) {
      throw new Error("MEDIA_REVIEW_EFFECTIVE_CONTENT_HASH_MISMATCH");
    }
  }
  const reviewerIdentity = `local-os:${os.userInfo().username}`;
  let current = effectiveDecisionMap(state.mappings, state.rights, pins);

  async function refreshDecisions() {
    const result = await readOnly(bootstrapSql, async (tx) => ({
      mappings: await tx`SELECT DISTINCT ON (mapping_key) mapping_key, media_sha256, media_kind, outcome,
        target_lexeme_identity, target_sense_proposal_key, target_example_key, target_content_fingerprint,
        target_snapshot_fingerprint, reviewer_identity, reviewed_at::text AS reviewed_at, evidence
        FROM ${tx.unsafe(`${TARGET.schema}.media_mapping_review_events_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}
        ORDER BY mapping_key, reviewed_at DESC, idempotency_key DESC`,
      rights: await tx`SELECT DISTINCT ON (COALESCE(media_sha256, 'GROUP:' || evidence_group_id)) idempotency_key, event_sha256,
        manifest_version, media_sha256, evidence_group_id, group_assets_fingerprint, rights_status, evidence_type,
        evidence_url, rights_holder, intended_use, reviewer_note, reviewer_identity, reviewed_at::text AS reviewed_at
        FROM ${tx.unsafe(`${TARGET.schema}.media_rights_review_events_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}
        ORDER BY COALESCE(media_sha256, 'GROUP:' || evidence_group_id), reviewed_at DESC, idempotency_key DESC`,
      counts: (await tx`SELECT
        (SELECT count(*)::int FROM ${tx.unsafe(`${TARGET.schema}.media_mapping_review_events_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}) AS mapping_events,
        (SELECT count(*)::int FROM ${tx.unsafe(`${TARGET.schema}.media_rights_review_events_v1`)} WHERE manifest_version = ${MANIFEST_VERSION}) AS rights_events`)[0],
    }));
    current = { ...effectiveDecisionMap(result.mappings, result.rights, pins),
      mappingEventCount: result.counts.mapping_events, rightsEventCount: result.counts.rights_events };
    return current;
  }

  async function liveTargetViews(proposalKeys) {
    const keys = [...new Set(proposalKeys)].filter((key) => pins.sensesByProposal.has(key));
    if (keys.length === 0) return new Map();
    const rows = await readOnly(bootstrapSql, async (tx) => tx`
      SELECT i.proposal_key, i.resolution_status, i.effective_content_hash, d.effective_content_hash AS draft_content_hash,
        d.editorial_status, d.headword, d.part_of_speech, d.definition_en, d.meaning_vi, d.examples
      FROM ${tx.unsafe(`${TARGET.schema}.identity_registry`)} i
      JOIN ${tx.unsafe(`${TARGET.schema}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
      WHERE i.proposal_key = ANY(${bootstrapSql.array(keys)})
    `);
    const byKey = new Map();
    for (const row of rows) {
      const pinned = pins.sensesByProposal.get(row.proposal_key);
      if (!pinned || row.resolution_status !== "EFFECTIVE" || row.editorial_status !== "DRAFT"
        || row.effective_content_hash !== pinned.contentHash || row.draft_content_hash !== pinned.draftContentHash) {
        throw new Error("MEDIA_REVIEW_TARGET_SNAPSHOT_STALE");
      }
      const view = targetView(pinned);
      if (row.headword !== view.headword || row.part_of_speech !== view.partOfSpeech || row.definition_en !== view.definitionEn
        || row.meaning_vi !== view.meaningVi || stable(row.examples) !== stable(pinned.content.examples)) throw new Error("MEDIA_REVIEW_TARGET_CONTENT_READBACK_MISMATCH");
      byKey.set(row.proposal_key, view);
    }
    if (byKey.size !== keys.length) throw new Error("MEDIA_REVIEW_TARGET_SENSE_NOT_EFFECTIVE");
    return byKey;
  }

  function rightsForAsset(sha, decisions) {
    const specific = decisions.asset.get(sha);
    const source = pins.rightsByHash.get(sha);
    const group = source ? decisions.group.get(source.evidenceGroupId) : null;
    const expectedGroupFingerprint = source ? pins.groupFingerprints.get(source.evidenceGroupId) : null;
    const validGroup = group && group.group_assets_fingerprint === expectedGroupFingerprint ? group : null;
    if (specific && validGroup) return new Date(specific.reviewed_at) >= new Date(validGroup.reviewed_at) ? specific : validGroup;
    return specific ?? validGroup ?? null;
  }

  function mappingView(row, decisions, liveTargets) {
    const sourceRecord = pins.recordsById.get(String(row.sourceNoteIdentity.sourceRecordId));
    const asset = pins.assetsByHash.get(row.mediaSha256);
    const source = displaySource(sourceRecord);
    const candidates = targetCandidates(row, pins).map((sense) => liveTargets.get(sense.proposalKey) ?? targetView(sense));
    const primary = row.targetSenseProposalKey ? (liveTargets.get(row.targetSenseProposalKey) ?? null) : null;
    const examples = candidates.flatMap((sense) => sense.examples.map((example) => ({
      proposalKey: sense.proposalKey,
      headword: sense.headword,
      partOfSpeech: sense.partOfSpeech,
      meaningVi: sense.meaningVi,
      definitionEn: sense.definitionEn,
      contentFingerprint: sense.contentFingerprint,
      exampleKey: example.exampleKey,
      index: example.index,
      en: example.en,
      vi: example.vi,
      textClassification: classifyExampleText(source.example, example.en),
    })));
    const review = decisions.mappings.get(row.mappingKey) ?? null;
    const right = rightsForAsset(row.mediaSha256, decisions);
    const sourceFile = asset.source_file_identities[0];
    return {
      mappingKey: row.mappingKey,
      mediaSha256: row.mediaSha256,
      mediaKind: row.mediaKind,
      sourceFilename: row.sourceFilename,
      sourceArchiveEntry: sourceFile?.archiveEntry ?? null,
      sourceNoteIdentity: row.sourceNoteIdentity,
      source,
      targetLexemeIdentity: row.targetLexemeIdentity,
      lexemePronunciationProfile: row.mediaKind === "WORD_PRONUNCIATION_AUDIO"
        ? pins.lexemePronunciationProfiles.get(row.targetLexemeIdentity) ?? null : null,
      proposedSense: primary,
      targetCandidates: candidates,
      targetExampleCandidates: examples,
      exampleTextComparison: row.mediaKind === "EXAMPLE_SENTENCE_AUDIO" ? compareExampleCandidates(row, pins) : null,
      mappingStatus: row.mappingStatus,
      mappingConfidence: row.mappingConfidence,
      mappingEvidence: row.mappingEvidence,
      review,
      rightsStatus: right?.rights_status ?? asset.rights_status,
      rightsEvidence: pins.rightsByHash.get(row.mediaSha256)?.evidence ?? [],
      evidenceGroupId: pins.rightsByHash.get(row.mediaSha256)?.evidenceGroupId ?? null,
      providerNeutralStorageKey: asset.provider_neutral_storage_key,
    };
  }

  function requestGuard(c) {
    const host = (c.req.header("host") ?? "").split(":")[0].toLowerCase();
    const origin = c.req.header("origin");
    return host === HOST && (!origin || origin === "http://127.0.0.1:5173");
  }

  const app = new Hono();
  app.get("/api/dev/media-review/health", (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    return c.json({ target: { projectId: TARGET.projectId, branchId: TARGET.branchId, database: TARGET.database, schema: TARGET.schema },
      effectiveSenses: 5616, reviewerIdentity, contractVersion: REVIEW_CONTRACT_VERSION }, 200, { "Cache-Control": "no-store" });
  });

  app.get("/api/dev/media-review", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const params = new URL(c.req.url).searchParams;
    const kind = params.get("kind") ?? "ILLUSTRATION_IMAGE";
    const status = params.get("status") ?? "UNREVIEWED";
    const search = (params.get("search") ?? "").trim().slice(0, 100).toLocaleLowerCase("und");
    const page = Number(params.get("page") ?? "1");
    if (!new Set(["ILLUSTRATION_IMAGE", "WORD_PRONUNCIATION_AUDIO", "EXAMPLE_SENTENCE_AUDIO"]).has(kind)
      || !new Set(["UNREVIEWED", "REVIEWED", "ALL", "PROPOSED", "AMBIGUOUS", "MISMATCH", "UNRESOLVED"]).has(status)
      || !Number.isSafeInteger(page) || page < 1 || page > PAGE_MAX) return c.json({ message: "Bộ lọc media không hợp lệ." }, 400, { "Cache-Control": "no-store" });
    try {
      const decisions = await refreshDecisions();
      let filtered = pins.bundle.mappings.filter((row) => row.mediaKind === kind);
      if (status === "UNREVIEWED") filtered = filtered.filter((row) => !decisions.mappings.has(row.mappingKey));
      if (status === "REVIEWED") filtered = filtered.filter((row) => decisions.mappings.has(row.mappingKey));
      if (status === "PROPOSED") filtered = filtered.filter((row) => row.mediaKind === "WORD_PRONUNCIATION_AUDIO"
        ? row.mappingStatus === "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION"
        : row.mediaKind === "ILLUSTRATION_IMAGE" && row.mappingStatus === "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW");
      if (status === "AMBIGUOUS") filtered = filtered.filter((row) => row.mappingStatus.includes("AMBIGUOUS") || decisions.mappings.get(row.mappingKey)?.outcome === "AMBIGUOUS");
      if (status === "MISMATCH") filtered = filtered.filter((row) => row.mappingStatus === "UNRESOLVED_EXAMPLE_TEXT_MISMATCH");
      if (status === "UNRESOLVED") filtered = filtered.filter((row) => row.mappingStatus === "UNRESOLVED_EXAMPLE_NO_EFFECTIVE_TARGET");
      if (search) filtered = filtered.filter((row) => {
        const source = pins.recordsById.get(String(row.sourceNoteIdentity.sourceRecordId));
        const evidence = row.mappingEvidence ?? {};
        const target = targetCandidates(row, pins).map((sense) => `${sense.content.headword} ${sense.content.partOfSpeech} ${sense.content.meaningVi} ${sense.content.definitionEn}`).join(" ");
        return `${source?.headwordText ?? ""} ${source?.sourceFields?.Word ?? ""} ${source?.sourceFields?.PoS ?? ""} ${row.sourceNoteIdentity.sourceRecordId} ${target} ${row.targetLexemeIdentity ?? ""} ${evidence.sourceGroupCrosswalkKey ?? ""}`.toLocaleLowerCase("und").includes(search);
      });
      const total = filtered.length;
      const selected = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const proposalKeys = selected.flatMap((row) => targetCandidates(row, pins).map((sense) => sense.proposalKey));
      const live = await liveTargetViews(proposalKeys);
      const items = selected.map((row) => mappingView(row, decisions, live));
      return c.json({
        target: { projectId: TARGET.projectId, branchId: TARGET.branchId, database: TARGET.database, schema: TARGET.schema },
        manifestVersion: MANIFEST_VERSION, sourceManifestSha256: pins.manifestSha, snapshotSha256: pins.snapshotSha,
        snapshotFingerprint: pins.snapshot.snapshotFingerprint, reviewerIdentity, kind, status, search, page, pageSize: PAGE_SIZE, total,
        normalization: EXAMPLE_TEXT_NORMALIZATION, items,
        counts: { sourceFiles: 13986, uniqueAssets: 13977, effectiveSenses: 5616, filtered: total },
      }, 200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    } catch (error) {
      const stale = error instanceof Error && error.message.includes("STALE");
      return c.json({ message: stale ? "Snapshot Development đã thay đổi. Hãy tạo snapshot mới trước khi review." : "Không đọc được media review staging Development." }, stale ? 409 : 503, { "Cache-Control": "no-store" });
    }
  });

  app.get("/api/dev/media-review/assets/:sha256/preview", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const mediaSha256 = c.req.param("sha256");
    const asset = pins.assetsByHash.get(mediaSha256);
    if (!asset || !/^[0-9a-f]{64}$/u.test(mediaSha256)) return c.json({ message: "Không tìm thấy asset đã pin." }, 404, { "Cache-Control": "no-store" });
    const entry = asset.source_file_identities?.find((file) => /^\d+$/u.test(String(file.archiveEntry ?? "")))?.archiveEntry;
    if (!entry) return c.json({ message: "Asset không có archive entry hợp lệ." }, 404, { "Cache-Control": "no-store" });
    try {
      const python = process.env.PYTHON ?? "python";
      const helper = path.join(ROOT, "scripts/read-english-vocabulary-4600-media-preview.py");
      const result = await execFile(python, [helper, pins.apkgPath, String(entry), mediaSha256], { encoding: "buffer", maxBuffer: 40 * 1024 * 1024, windowsHide: true });
      const mime = asset.detected_mime_type === "image/jpeg" ? "image/jpeg" : asset.detected_mime_type === "image/png" ? "image/png"
        : asset.detected_mime_type === "image/gif" ? "image/gif"
        : asset.detected_mime_type === "image/webp" ? "image/webp" : asset.detected_mime_type === "audio/mpeg" ? "audio/mpeg" : null;
      if (!mime || sha256(result.stdout) !== mediaSha256) return c.json({ message: "Asset preview không khớp SHA256 đã pin." }, 409, { "Cache-Control": "no-store" });
      return new Response(result.stdout, { status: 200, headers: { "Content-Type": mime, "Content-Length": String(result.stdout.length),
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
    } catch {
      return c.json({ message: "Không thể đọc media này từ APKG đã pin hoặc SHA256 không khớp." }, 409, { "Cache-Control": "no-store" });
    }
  });

  app.get("/api/dev/media-review/senses/:proposalKey/learning-preview", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const proposalKey = c.req.param("proposalKey");
    const params = new URL(c.req.url).searchParams;
    const contentFingerprint = params.get("contentFingerprint") ?? "";
    const includeProposed = params.get("includeProposed") === "1";
    const pinnedSense = pins.sensesByProposal.get(proposalKey);
    if (!pinnedSense || !/^[0-9a-f]{64}$/u.test(contentFingerprint)
      || pinnedSense.contentHash !== contentFingerprint) {
      return c.json({ message: "Không tìm thấy Sense effective được pin." }, 404, { "Cache-Control": "no-store" });
    }
    try {
      const decisions = await refreshDecisions();
      const live = await liveTargetViews([proposalKey]);
      const sense = live.get(proposalKey);
      if (!sense || sense.contentFingerprint !== contentFingerprint) {
        return c.json({ message: "Sense đã thay đổi so với content fingerprint được pin." }, 409, { "Cache-Control": "no-store" });
      }
      const rightsByHash = new Map([...pins.assetsByHash.keys()].map((mediaSha256) => [
        mediaSha256,
        rightsForAsset(mediaSha256, decisions),
      ]));
      const result = buildSenseMediaPreview({
        sense: {
          proposalKey: sense.proposalKey,
          contentFingerprint: sense.contentFingerprint,
          headword: sense.headword,
          partOfSpeech: sense.partOfSpeech,
          examples: sense.examples,
        },
        mappings: pins.bundle.mappings,
        decisions: decisions.mappings,
        recordsById: pins.recordsById,
        assetsByHash: pins.assetsByHash,
        rightsByHash,
        snapshotFingerprint: pins.snapshot.snapshotFingerprint,
        classifyExampleText,
        plainSourceText,
        lexemePronunciationProfiles: pins.lexemePronunciationProfiles,
        includeProposed,
      });
      return c.json(result, 200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    } catch {
      return c.json({ message: "Không thể xác minh mapping media của Sense trong Development." }, 503, { "Cache-Control": "no-store" });
    }
  });

  app.get("/api/dev/media-review/rights-assets", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const params = new URL(c.req.url).searchParams;
    const search = (params.get("search") ?? "").trim().slice(0, 100).toLocaleLowerCase("und");
    const status = params.get("status") ?? "ALL";
    const page = Number(params.get("page") ?? "1");
    if (!new Set(["ALL", "CLEARED_FOR_INTENDED_USE", "INTERNAL_REFERENCE_ONLY", "UNKNOWN_REVIEW_REQUIRED", "RESTRICTED"]).has(status)
      || !Number.isSafeInteger(page) || page < 1 || page > PAGE_MAX) return c.json({ message: "Bộ lọc rights không hợp lệ." }, 400, { "Cache-Control": "no-store" });
    try {
      const decisions = await refreshDecisions();
      const byHash = new Map();
      for (const mapping of pins.bundle.mappings) {
        if (!byHash.has(mapping.mediaSha256)) byHash.set(mapping.mediaSha256, []);
        byHash.get(mapping.mediaSha256).push(mapping);
      }
      let assets = pins.manifest.assets.map((asset) => {
        const ledger = pins.rightsByHash.get(asset.media_sha256);
        const mappings = byHash.get(asset.media_sha256) ?? [];
        const effectiveRight = rightsForAsset(asset.media_sha256, decisions);
        const reviewedMappings = mappings.map((mapping) => decisions.mappings.get(mapping.mappingKey)).filter(Boolean);
        const acceptedCount = reviewedMappings.filter((row) => ["ACCEPT_MAPPING", "EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT", "EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"].includes(row.outcome)).length;
        const item = { mediaSha256: asset.media_sha256, mediaKind: asset.media_kind, mediaRoles: asset.media_roles,
          byteLength: asset.byte_length, mimeType: asset.detected_mime_type, fileIdentities: asset.source_file_identities,
          noteIdentities: asset.source_note_identities, providerNeutralStorageKey: asset.provider_neutral_storage_key,
          evidenceGroupId: ledger.evidenceGroupId, rightsStatus: effectiveRight?.rights_status ?? asset.rights_status,
          evidenceGroupAssetCount: pins.groupSizes.get(ledger.evidenceGroupId) ?? 0,
          groupAssetsFingerprint: pins.groupFingerprints.get(ledger.evidenceGroupId) ?? null,
          rightsDecision: effectiveRight ? { scope: effectiveRight.media_sha256 ? "ASSET" : "GROUP",
            rightsStatus: effectiveRight.rights_status,
            evidenceType: effectiveRight.evidence_type, evidenceUrl: effectiveRight.evidence_url,
            rightsHolder: effectiveRight.rights_holder, intendedUse: effectiveRight.intended_use,
            reviewerNote: effectiveRight.reviewer_note, reviewerIdentity: effectiveRight.reviewer_identity,
            reviewedAt: effectiveRight.reviewed_at } : null,
          rightsEvidence: ledger.evidence, mappingReferenceCount: mappings.length, acceptedMappingCount: acceptedCount,
          reviewedMappingCount: reviewedMappings.length };
        return item;
      });
      if (status !== "ALL") assets = assets.filter((asset) => asset.rightsStatus === status);
      if (search) assets = assets.filter((asset) => `${asset.mediaSha256} ${asset.mediaRoles.join(" ")} ${asset.fileIdentities.map((item) => `${item.sourceFilename} ${item.archiveEntry}`).join(" ")} ${asset.noteIdentities.map((item) => `${item.sourceRecordId} ${item.sourceNoteGuid}`).join(" ")}`.toLocaleLowerCase("und").includes(search));
      const total = assets.length;
      const items = assets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const counts = Object.fromEntries(["CLEARED_FOR_INTENDED_USE", "INTERNAL_REFERENCE_ONLY", "UNKNOWN_REVIEW_REQUIRED", "RESTRICTED"]
        .map((rightsStatus) => [rightsStatus, assets.filter((asset) => asset.rightsStatus === rightsStatus).length]));
      return c.json({ target: { projectId: TARGET.projectId, branchId: TARGET.branchId, database: TARGET.database, schema: TARGET.schema },
        sourceManifestSha256: pins.manifestSha, snapshotFingerprint: pins.snapshot.snapshotFingerprint, reviewerIdentity,
        page, pageSize: PAGE_SIZE, total, counts, items }, 200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    } catch {
      return c.json({ message: "Không đọc được rights ledger và quyết định Development." }, 503, { "Cache-Control": "no-store" });
    }
  });

  app.post("/api/dev/media-review/decisions/batch", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const contentLength = Number(c.req.header("content-length") ?? "0");
    if (contentLength > 64000 || !(c.req.header("content-type") ?? "").toLowerCase().startsWith("application/json")) return c.json({ message: "Yêu cầu review không hợp lệ." }, 400, { "Cache-Control": "no-store" });
    let body;
    try { body = await c.req.json(); } catch { return c.json({ message: "Không đọc được nội dung quyết định." }, 400, { "Cache-Control": "no-store" }); }
    if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 20) return c.json({ message: "Chọn từ 1 đến 20 mapping trong trang hiện tại." }, 400, { "Cache-Control": "no-store" });
    const seen = new Set();
    const prepared = [];
    try {
      const pageTargetKeys = new Set();
      for (const input of body.items) {
        const validation = validateMappingDecision(input);
        if (!validation.ok) return c.json({ message: "Quyết định hoặc identity mapping không hợp lệ.", code: validation.reason }, 400, { "Cache-Control": "no-store" });
        if (!/^[0-9a-f-]{36}$/u.test(String(input.idempotencyKey ?? ""))) return c.json({ message: "Idempotency key không hợp lệ." }, 400, { "Cache-Control": "no-store" });
        if (seen.has(input.mappingKey)) return c.json({ message: "Một mapping xuất hiện nhiều lần trong lô." }, 400, { "Cache-Control": "no-store" });
        seen.add(input.mappingKey);
        const mapping = pins.mappingsByKey.get(input.mappingKey);
        if (!mapping || mapping.mediaSha256 !== input.mediaSha256 || mapping.mediaKind !== input.mediaKind) return c.json({ message: "Mapping không khớp manifest đã pin." }, 409, { "Cache-Control": "no-store" });
        const evidence = mapping.mappingEvidence ?? {};
        const allowedTargets = new Set([mapping.targetSenseProposalKey, ...(evidence.candidateProposalKeysPendingSelection ?? []),
          ...(evidence.effectiveSourceEvidenceProposalKeys ?? []), ...(evidence.mismatchCandidateProposalKeys ?? [])].filter(Boolean));
        let targetSenseProposalKey = null;
        let targetExampleKey = null;
        let targetContentFingerprint = null;
        let targetLexemeIdentity = null;
        let decisionEvidence = { reviewContractVersion: REVIEW_CONTRACT_VERSION, reviewerNote: String(input.reviewerNote ?? "").slice(0, 2000) };
        if (input.mediaKind === "ILLUSTRATION_IMAGE" && input.outcome === "ACCEPT_MAPPING") {
          targetSenseProposalKey = String(input.targetSenseProposalKey ?? "");
          const sense = pins.sensesByProposal.get(targetSenseProposalKey);
          if (!sense || !allowedTargets.has(targetSenseProposalKey) || sense.editorialStatus !== "DRAFT"
            || sense.contentHash !== sense.draftContentHash || sense.contentHash !== input.targetContentFingerprint) return c.json({ message: "Ảnh chỉ được chấp nhận cho Sense DRAFT hiệu lực trong candidate đã pin." }, 409, { "Cache-Control": "no-store" });
          pageTargetKeys.add(targetSenseProposalKey);
          targetContentFingerprint = sense.contentHash;
        }
        if (input.mediaKind === "WORD_PRONUNCIATION_AUDIO" && ["EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT", "HOMOGRAPH_DIFFERENT_PRONUNCIATION"].includes(input.outcome)) {
          if (input.targetLexemeIdentity !== mapping.targetLexemeIdentity) return c.json({ message: "Lexeme target không khớp source identity và bundle đã pin." }, 409, { "Cache-Control": "no-store" });
          targetLexemeIdentity = mapping.targetLexemeIdentity;
          decisionEvidence = { ...decisionEvidence, pronunciationEvidence: evidence.pronunciationEvidence ?? null,
            sourceIpaSha256: evidence.sourceIpaSha256 ?? null, sourcePosClasses: evidence.sourcePosClasses ?? [] };
        }
        if (input.mediaKind === "EXAMPLE_SENTENCE_AUDIO" && ["EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"].includes(input.outcome)) {
          targetSenseProposalKey = String(input.targetSenseProposalKey ?? "");
          targetExampleKey = String(input.targetExampleKey ?? "");
          const sense = pins.sensesByProposal.get(targetSenseProposalKey);
          if (!sense || !allowedTargets.has(targetSenseProposalKey) || sense.editorialStatus !== "DRAFT" || sense.contentHash !== input.targetContentFingerprint) {
            return c.json({ message: "Câu đích không thuộc candidate Sense DRAFT đã pin." }, 409, { "Cache-Control": "no-store" });
          }
          const exampleIndex = Number(targetExampleKey.match(/:example-(\d+)$/u)?.[1]) - 1;
          const example = sense.content.examples?.[exampleIndex];
          const classification = classifyExampleText(pins.recordsById.get(String(mapping.sourceNoteIdentity.sourceRecordId))?.sourceFields?.Example, example?.en);
          if (!example || targetExampleKey !== `${targetSenseProposalKey}:example-${exampleIndex + 1}` || classification !== input.outcome) {
            return c.json({ message: "Câu đích không khớp theo contract văn bản đã công bố." }, 409, { "Cache-Control": "no-store" });
          }
          pageTargetKeys.add(targetSenseProposalKey);
          targetContentFingerprint = sense.contentHash;
          decisionEvidence = { ...decisionEvidence, normalizationContract: EXAMPLE_TEXT_NORMALIZATION.version, textClassification: classification,
            sourceTextSha256: sha256(plainSourceText(pins.recordsById.get(String(mapping.sourceNoteIdentity.sourceRecordId))?.sourceFields?.Example)),
            targetTextSha256: sha256(plainSourceText(example.en)) };
        }
        if (input.mediaKind === "EXAMPLE_SENTENCE_AUDIO" && ["DIFFERENT_SENTENCE", "UNRESOLVED"].includes(input.outcome)) {
          decisionEvidence = { ...decisionEvidence, normalizationContract: EXAMPLE_TEXT_NORMALIZATION.version,
            classification: input.outcome, sourceExamplePreserved: true };
        }
        const sourceNote = mapping.sourceNoteIdentity;
        const value = {
          idempotency_key: String(input.idempotencyKey ?? ""),
          manifest_version: MANIFEST_VERSION,
          mapping_bundle_version: pins.bundle.bundleVersion,
          mapping_key: mapping.mappingKey,
          media_sha256: mapping.mediaSha256,
          media_kind: mapping.mediaKind,
          outcome: input.outcome,
          source_note_id: String(sourceNote.sourceRecordId),
          source_note_guid: String(sourceNote.sourceNoteGuid),
          source_record_evidence_sha256: String(sourceNote.recordEvidenceSha256),
          target_lexeme_identity: targetLexemeIdentity,
          target_sense_proposal_key: targetSenseProposalKey,
          target_example_key: targetExampleKey,
          target_content_fingerprint: targetContentFingerprint,
          target_snapshot_fingerprint: pins.snapshot.snapshotFingerprint,
          reviewer_identity: reviewerIdentity,
          evidence: decisionEvidence,
        };
        value.event_sha256 = sha256(stable(value));
        prepared.push(value);
      }
      if (pageTargetKeys.size) await liveTargetViews([...pageTargetKeys]);
      const inserted = await migrationSql.begin(async (tx) => {
        const result = [];
        for (const value of prepared) {
          const { event_sha256: eventHash, ...columns } = value;
          await tx`INSERT INTO ${tx.unsafe(`${TARGET.schema}.media_mapping_review_events_v1`)} (
            idempotency_key, event_sha256, manifest_version, mapping_bundle_version, mapping_key, media_sha256, media_kind,
            outcome, source_note_id, source_note_guid, source_record_evidence_sha256, target_lexeme_identity,
            target_sense_proposal_key, target_example_key, target_content_fingerprint, target_snapshot_fingerprint,
            reviewer_identity, evidence
          ) VALUES (${columns.idempotency_key}, ${eventHash}, ${columns.manifest_version}, ${columns.mapping_bundle_version},
            ${columns.mapping_key}, ${columns.media_sha256}, ${columns.media_kind}, ${columns.outcome}, ${columns.source_note_id},
            ${columns.source_note_guid}, ${columns.source_record_evidence_sha256}, ${columns.target_lexeme_identity},
            ${columns.target_sense_proposal_key}, ${columns.target_example_key}, ${columns.target_content_fingerprint},
            ${columns.target_snapshot_fingerprint}, ${columns.reviewer_identity}, ${tx.json(columns.evidence)})
            ON CONFLICT (idempotency_key) DO NOTHING`;
          const existing = await tx`SELECT event_sha256, reviewed_at::text AS reviewed_at, reviewer_identity
            FROM ${tx.unsafe(`${TARGET.schema}.media_mapping_review_events_v1`)} WHERE idempotency_key = ${value.idempotency_key}`;
          if (!isIdempotentReplay(existing, eventHash)) throw new Error("IDEMPOTENCY_KEY_PAYLOAD_CONFLICT");
          result.push(existing[0]);
        }
        return result;
      });
      await refreshDecisions();
      return c.json({ saved: inserted.length, reviewerIdentity, events: inserted.map((row, index) => ({
        mappingKey: prepared[index].mapping_key, outcome: prepared[index].outcome, reviewedAt: row.reviewed_at,
      })) }, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      const conflict = error instanceof Error && error.message.includes("IDEMPOTENCY_KEY");
      return c.json({ message: conflict ? "Idempotency key đã được dùng cho quyết định khác." : "Không lưu được review vào staging Development." }, conflict ? 409 : 503, { "Cache-Control": "no-store" });
    }
  });

  app.post("/api/dev/media-review/rights", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    const contentLength = Number(c.req.header("content-length") ?? "0");
    if (contentLength > 24000 || !(c.req.header("content-type") ?? "").toLowerCase().startsWith("application/json")) return c.json({ message: "Yêu cầu rights review không hợp lệ." }, 400, { "Cache-Control": "no-store" });
    let input;
    try { input = await c.req.json(); } catch { return c.json({ message: "Không đọc được rights decision." }, 400, { "Cache-Control": "no-store" }); }
    const source = input.scope === "GROUP" ? pins.rightsLedger.evidenceGroups.find((group) => group.evidenceGroupId === input.evidenceGroupId) : null;
    const validation = validateRightsDecision(input, source);
    if (!validation.ok) return c.json({ message: "Quyết định quyền hoặc evidence chưa đáp ứng gate.", code: validation.reason }, 400, { "Cache-Control": "no-store" });
    const sha = input.scope === "ASSET" ? String(input.mediaSha256 ?? "") : null;
    const assetRights = sha ? pins.rightsByHash.get(sha) : null;
    if ((input.scope === "ASSET" && (!assetRights || !pins.assetsByHash.has(sha)))
      || (input.scope === "GROUP" && (!source || input.groupAssetsFingerprint !== pins.groupFingerprints.get(source.evidenceGroupId)))) {
      return c.json({ message: "Asset hoặc group identity không khớp manifest đã pin." }, 409, { "Cache-Control": "no-store" });
    }
    const idempotencyKey = String(input.idempotencyKey ?? "");
    if (!/^[0-9a-f-]{36}$/u.test(idempotencyKey)) return c.json({ message: "Idempotency key không hợp lệ." }, 400, { "Cache-Control": "no-store" });
    const value = {
      idempotency_key: idempotencyKey,
      manifest_version: MANIFEST_VERSION,
      media_sha256: sha,
      evidence_group_id: input.scope === "GROUP" ? input.evidenceGroupId : null,
      group_assets_fingerprint: input.scope === "GROUP" ? pins.groupFingerprints.get(input.evidenceGroupId) : null,
      rights_status: validation.normalized.status,
      evidence_type: validation.normalized.evidenceType,
      evidence_url: validation.normalized.evidenceUrl || null,
      rights_holder: validation.normalized.rightsHolder || null,
      intended_use: validation.normalized.intendedUse || null,
      reviewer_note: String(input.reviewerNote ?? "").trim().slice(0, 2000),
      reviewer_identity: reviewerIdentity,
    };
    const eventHash = sha256(stable(value));
    try {
      await migrationSql.begin(async (tx) => {
        await tx`INSERT INTO ${tx.unsafe(`${TARGET.schema}.media_rights_review_events_v1`)} (
          idempotency_key, event_sha256, manifest_version, media_sha256, evidence_group_id, group_assets_fingerprint,
          rights_status, evidence_type, evidence_url, rights_holder, intended_use, reviewer_note, reviewer_identity
        ) VALUES (${value.idempotency_key}, ${eventHash}, ${value.manifest_version}, ${value.media_sha256},
          ${value.evidence_group_id}, ${value.group_assets_fingerprint}, ${value.rights_status}, ${value.evidence_type},
          ${value.evidence_url}, ${value.rights_holder}, ${value.intended_use}, ${value.reviewer_note}, ${value.reviewer_identity})
          ON CONFLICT (idempotency_key) DO NOTHING`;
        const existing = await tx`SELECT event_sha256 FROM ${tx.unsafe(`${TARGET.schema}.media_rights_review_events_v1`)}
          WHERE idempotency_key = ${idempotencyKey}`;
        if (!isIdempotentReplay(existing, eventHash)) throw new Error("IDEMPOTENCY_KEY_PAYLOAD_CONFLICT");
      });
      await refreshDecisions();
      return c.json({ saved: true, reviewerIdentity, rightsStatus: value.rights_status, mediaSha256: sha,
        evidenceGroupId: value.evidence_group_id }, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      const conflict = error instanceof Error && error.message.includes("IDEMPOTENCY_KEY");
      return c.json({ message: conflict ? "Idempotency key đã được dùng cho quyết định khác." : "Không lưu được quyền vào staging Development." }, conflict ? 409 : 503, { "Cache-Control": "no-store" });
    }
  });

  app.get("/api/dev/media-review/readiness", async (c) => {
    if (!requestGuard(c)) return c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" });
    try {
      const decisions = await refreshDecisions();
      const mappingRows = [...decisions.mappings.entries()].map(([mappingKey, row]) => ({
        mappingKey, mediaSha256: row.media_sha256, mediaKind: row.media_kind, outcome: row.outcome,
        targetSenseProposalKey: row.target_sense_proposal_key, targetExampleKey: row.target_example_key, targetLexemeIdentity: row.target_lexeme_identity,
      }));
      const rightsRows = pins.manifest.assets.map((asset) => {
        const row = rightsForAsset(asset.media_sha256, decisions);
        return { mediaSha256: asset.media_sha256, rightsStatus: row?.rights_status ?? "UNKNOWN_REVIEW_REQUIRED",
          intendedUse: row?.intended_use ?? null, reviewedAt: row?.reviewed_at ?? "1970-01-01T00:00:00.000Z" };
      });
      const sets = buildReadinessSets({ assets: pins.manifest.assets, mappings: pins.bundle.mappings, mappingDecisions: mappingRows,
        rightsDecisions: rightsRows, rightsLedger: pins.rightsLedger });
      const imageDecisions = mappingRows.filter((row) => row.mediaKind === "ILLUSTRATION_IMAGE");
      const wordDecisions = mappingRows.filter((row) => row.mediaKind === "WORD_PRONUNCIATION_AUDIO");
      const wordProposals = pins.bundle.mappings.filter((row) => row.mediaKind === "WORD_PRONUNCIATION_AUDIO"
        && row.mappingStatus === "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION");
      const exampleClassificationCounts = { EXACT_TEXT_MATCH: 0, SAFE_NORMALIZED_MATCH: 0, DIFFERENT_SENTENCE: 0, UNRESOLVED: 0 };
      for (const row of pins.bundle.mappings.filter((mapping) => mapping.mediaKind === "EXAMPLE_SENTENCE_AUDIO")) {
        exampleClassificationCounts[compareExampleCandidates(row, pins).classification] += 1;
      }
      const rightsCounts = Object.fromEntries(["CLEARED_FOR_INTENDED_USE", "INTERNAL_REFERENCE_ONLY", "UNKNOWN_REVIEW_REQUIRED", "RESTRICTED"]
        .map((status) => [status, rightsRows.filter((row) => row.rightsStatus === status).length]));
      const readiness = {
        schemaVersion: 1,
        reportVersion: "english-vocabulary-4600-media-review-readiness-v1.0.0",
        reviewContractVersion: REVIEW_CONTRACT_VERSION,
        exampleNormalizationContract: EXAMPLE_TEXT_NORMALIZATION,
        target: { projectId: TARGET.projectId, branchId: TARGET.branchId, database: TARGET.database, schema: TARGET.schema },
        source: { id: "ENGLISH_VOCAB_4600", manifestVersion: MANIFEST_VERSION,
          apkgSha256: pins.apkgSha, manifestSha256: pins.manifestSha, snapshotSha256: pins.snapshotSha,
          snapshotFingerprint: pins.snapshot.snapshotFingerprint },
        sourceFiles: { images: 4669, wordAudio: 4649, exampleAudio: 4669, physical: 13986, uniqueHashes: 13977 },
        mapping: { imageReviewRows: 2981, proposedImageSenseIdentities: 2979,
          imageAccepted: imageDecisions.filter((row) => row.outcome === "ACCEPT_MAPPING").length,
          imageRejected: imageDecisions.filter((row) => row.outcome === "REJECT_MAPPING").length,
          imageAmbiguous: imageDecisions.filter((row) => row.outcome === "AMBIGUOUS").length,
          imageNeedsReview: imageDecisions.filter((row) => row.outcome === "NEEDS_REVIEW").length,
          proposedWordAudioRows: wordProposals.length,
          wordAudioAccepted: wordDecisions.filter((row) => ["EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT"].includes(row.outcome)).length,
          wordAudioHomographDifferentPronunciation: wordDecisions.filter((row) => row.outcome === "HOMOGRAPH_DIFFERENT_PRONUNCIATION").length,
          wordAudioUnresolved: wordProposals.length - wordDecisions.filter((row) => ["EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT", "HOMOGRAPH_DIFFERENT_PRONUNCIATION", "INVALID_ASSOCIATION"].includes(row.outcome)).length,
          exampleAudio: exampleClassificationCounts,
          exampleMismatchRows: 3746, exampleUnresolvedRows: 928 },
        rights: rightsCounts,
        cloudinary: { mode: "OFFLINE_PLAN_ONLY", eligibleAssetCount: sets.cloudinaryEligible.length,
          eligibleAssets: sets.cloudinaryEligible, blockedAssetCount: sets.blockedAssets.length, blockedAssets: sets.blockedAssets },
        neon: { mappingReviewEventCount: decisions.mappingEventCount, rightsReviewEventCount: decisions.rightsEventCount,
          reviewerIdentity, runtimePreserved: true },
      };
      const rendered = `${JSON.stringify(readiness, null, 2)}\n`;
      mkdirSync(WORKSPACE, { recursive: true });
      const reportPath = path.join(WORKSPACE, "media-review-readiness-v1.json");
      writeFileSync(reportPath, rendered, "utf8");
      writeFileSync(path.join(WORKSPACE, "cloudinary-eligible-media-review-v1.json"), `${JSON.stringify({ reportVersion: readiness.reportVersion, assets: sets.cloudinaryEligible }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(WORKSPACE, "cloudinary-blocked-media-review-v1.json"), `${JSON.stringify({ reportVersion: readiness.reportVersion, assets: sets.blockedAssets }, null, 2)}\n`, "utf8");
      const requestedSet = new URL(c.req.url).searchParams.get("download");
      if (requestedSet === "eligible") return c.json({ reportVersion: readiness.reportVersion, assets: sets.cloudinaryEligible }, 200, { "Cache-Control": "no-store" });
      if (requestedSet === "blocked") return c.json({ reportVersion: readiness.reportVersion, assets: sets.blockedAssets }, 200, { "Cache-Control": "no-store" });
      const summary = {
        contractVersion: REVIEW_CONTRACT_VERSION,
        target: { projectId: TARGET.projectId, branchId: TARGET.branchId, database: TARGET.database, schema: TARGET.schema },
        sourceManifestSha256: pins.manifestSha, sourceApkgSha256: pins.apkgSha,
        snapshotSha256: pins.snapshotSha, snapshotFingerprint: pins.snapshot.snapshotFingerprint,
        physicalSourceFiles: 13986, uniqueAssets: 13977,
        imageReviews: readiness.mapping,
        wordAudio: { proposedReferences: wordProposals.length, accepted: readiness.mapping.wordAudioAccepted,
          homographDifferentPronunciation: readiness.mapping.wordAudioHomographDifferentPronunciation, unresolved: readiness.mapping.wordAudioUnresolved },
        exampleAudio: { ...exampleClassificationCounts, mismatchRows: 3746, priorUnresolvedRows: 928, normalizationContract: EXAMPLE_TEXT_NORMALIZATION.version },
        rights: { ...rightsCounts, pageNotice: "CC BY-NC notice is recorded as page-level evidence only; it does not clear individual source image/audio assets." },
        cloudinary: { mode: "OFFLINE_PLAN_ONLY", eligibleAssets: sets.cloudinaryEligible.length, blockedAssetCount: sets.blockedAssets.length,
          eligibleSetPath: "cloudinary-eligible-media-review-v1.json", blockedSetPath: "cloudinary-blocked-media-review-v1.json" },
        neon: { mappingReviewEvents: decisions.mappingEventCount, rightsReviewEvents: decisions.rightsEventCount,
          reviewerIdentity, runtimeStagingUsage: false, runtimeVocabularyWrite: false, learnerHistoryWrite: false },
      };
      return c.json({ ...summary, reportPath: "media-review-readiness-v1.json" }, 200, { "Cache-Control": "no-store" });
    } catch {
      return c.json({ message: "Không thể tính readiness từ staging và manifest đã pin." }, 503, { "Cache-Control": "no-store" });
    }
  });

  app.all("*", (c) => c.json({ message: "Not found." }, 404, { "Cache-Control": "no-store" }));
  serve({ fetch: app.fetch, hostname: HOST, port: PORT });
  process.stdout.write(`Development 4600 media review API listening on http://${HOST}:${PORT}; target ${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}; append-only staging decisions only.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "MEDIA_REVIEW_STARTUP_FAILED"}\n`);
  process.exitCode = 1;
});
