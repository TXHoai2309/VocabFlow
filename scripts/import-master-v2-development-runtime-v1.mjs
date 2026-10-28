import { createHash } from "node:crypto";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { classifyExampleText, plainSourceText } from "./english-vocabulary-4600-media-review-contract.mjs";

const ROOT = process.cwd();
const TARGET = Object.freeze({ projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", database: "neondb", endpointId: "ep-small-shadow-b3ny4993", schema: "vocabflow_editorial_staging" });
const V2_SOURCE = "VOCABFLOW_MASTER_V2_DEV";
const DEV_WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const MEDIA_WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2");
const QUEUE_PATH = path.join(DEV_WORKSPACE, "independent-content-review-queue-v1.json");
const CANDIDATE_PATH = path.join(DEV_WORKSPACE, "master-v2-release-candidate-v9.json");
const MANIFEST_PATH = path.join(MEDIA_WORKSPACE, "media-manifest-v2.json");
const BUNDLE_PATH = path.join(MEDIA_WORKSPACE, "media-mapping-bundle-v1.json");
const INVENTORY_PATH = path.resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/vocab4600-normalized-inventory.json");
const OXFORD_INVENTORY_PATH = path.resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/oxford-normalized-inventory.json");
const OUT_DIR = path.join(DEV_WORKSPACE, "development-runtime-v1");
const SNAPSHOT_PATH = path.join(OUT_DIR, "master-v2-development-runtime-snapshot-v1.json");

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function readPinnedJson(file) { const raw = readFileSync(file); return { raw, value: JSON.parse(raw.toString("utf8")), sha256: sha256(raw) }; }
function fromJson(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}
function normalized(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("und")
    .replace(/<[^>]*>/gu, " ").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/gu, " ");
}
function normalizePos(value) {
  const pos = normalized(value).replace(/\s+/gu, "_").toUpperCase();
  if (["ADJECTIVE", "ADJ"].includes(pos)) return "ADJ";
  if (["ADVERB", "ADV"].includes(pos)) return "ADV";
  if (["NOUN", "N"].includes(pos)) return "NOUN";
  if (["VERB", "V", "AUXILIARY_VERB", "MODAL_VERB"].includes(pos)) return "VERB";
  if (["PREPOSITION", "PREP"].includes(pos)) return "PREP";
  if (["PRONOUN", "PRON"].includes(pos)) return "PRON";
  if (["CONJUNCTION", "CONJ"].includes(pos)) return "CONJ";
  if (["DETERMINER", "DET", "ARTICLE"].includes(pos)) return "DET";
  return pos;
}
function sourcePosForMaster(pos) {
  const mapped = { ADJECTIVE: "ADJ", ADVERB: "ADV", NOUN: "NOUN", VERB: "VERB", AUXILIARY_VERB: "VERB", MODAL_VERB: "VERB", PREPOSITION: "PREP", PRONOUN: "PRON", CONJUNCTION: "CONJ", DETERMINER: "DET", NUMBER: "NUMBER", INTERJECTION: "INTERJECTION" };
  return mapped[pos] ?? pos;
}
function noteIdentity(mapping) {
  return `${mapping.source_note_id}:${mapping.source_note_guid}`;
}
function mediaUrl(hash) { return `/api/dev/media-review/assets/${hash}/preview`; }
function parseReceiptEntry(receipt, proposalKey, hash) {
  if (!Array.isArray(receipt.entries)) return null;
  return receipt.entries.find((entry) => entry.proposalKey === proposalKey
    && (entry.effectiveContentHash === hash || entry.reviewedContentHash === hash)
    && (entry.decision ?? entry.verdict ?? entry.disposition ?? entry.revisedDecision) === "PASS") ?? null;
}
function validateReceipt(disposition, cache) {
  const receiptPath = path.resolve(ROOT, disposition.contentReviewReceipt);
  if (!receiptPath.startsWith(ROOT + path.sep) || !existsSync(receiptPath)) throw new Error("REVIEW_RECEIPT_MISSING_OR_OUTSIDE_REPOSITORY");
  if (!cache.has(receiptPath)) cache.set(receiptPath, readPinnedJson(receiptPath));
  const receiptFile = cache.get(receiptPath);
  const receipt = receiptFile.value;
  if (receipt.reviewerIdentity !== disposition.reviewerIdentity
    || !parseReceiptEntry(receipt, disposition.proposalKey, disposition.effectiveContentHash)) {
    throw new Error("REVIEW_RECEIPT_DOES_NOT_PIN_CURRENT_PASS_HASH");
  }
  return { path: path.relative(ROOT, receiptPath).replaceAll("\\", "/"), sha256: receiptFile.sha256, reviewerIdentity: disposition.reviewerIdentity };
}

async function verifyProviderTarget(env) {
  if (env.VOCABFLOW_ENV !== "development" || env.DATABASE_ENV !== "development" || env.EXECUTION_CONTEXT !== "local-development" || env.VERCEL_ENV) throw new Error("LOCAL_DEVELOPMENT_ENVIRONMENT_REQUIRED");
  if (!env.NEON_API_KEY) throw new Error("NEON_TARGET_VERIFICATION_REQUIRED");
  for (const [name, role] of [["BOOTSTRAP_DATABASE_URL", "vocabflow_identity_bootstrap"], ["DATABASE_MIGRATION_URL", "vocabflow_migration"], ["DATABASE_URL", "vocabflow_runtime"]]) {
    const value = env[name];
    if (!value) throw new Error(`${name}_REQUIRED`);
    const parsed = new URL(value);
    const endpointHost = parsed.hostname.startsWith(`${TARGET.endpointId}.`) || parsed.hostname.startsWith(`${TARGET.endpointId}-pooler.`);
    if (decodeURIComponent(parsed.pathname.replace(/^\//u, "")) !== TARGET.database || decodeURIComponent(parsed.username) !== role
      || !parsed.hostname.endsWith(".neon.tech") || !endpointHost) throw new Error("DEVELOPMENT_CONNECTION_TARGET_MISMATCH");
  }
  const headers = { Authorization: `Bearer ${env.NEON_API_KEY}` };
  const [branchResponse, endpointsResponse] = await Promise.all([
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/branches/${TARGET.branchId}`, { headers }),
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/endpoints`, { headers })
  ]);
  if (!branchResponse.ok || !endpointsResponse.ok) throw new Error("NEON_DEVELOPMENT_TARGET_VERIFICATION_FAILED");
  const branch = await branchResponse.json();
  const endpoints = await endpointsResponse.json();
  const endpoint = (endpoints.endpoints ?? []).find((item) => item.id === TARGET.endpointId);
  if (branch?.branch?.project_id !== TARGET.projectId || branch?.branch?.id !== TARGET.branchId
    || endpoint?.branch_id !== TARGET.branchId || endpoint?.type !== "read_write") throw new Error("NEON_DEVELOPMENT_TARGET_MISMATCH");
}

function validateArtifacts() {
  const queueFile = readPinnedJson(QUEUE_PATH);
  const candidateFile = readPinnedJson(CANDIDATE_PATH);
  const mediaFile = readPinnedJson(MANIFEST_PATH);
  const bundleFile = readPinnedJson(BUNDLE_PATH);
  const inventoryFile = readPinnedJson(INVENTORY_PATH);
  const oxfordFile = readPinnedJson(OXFORD_INVENTORY_PATH);
  const queue = queueFile.value;
  const candidate = candidateFile.value;
  const mediaManifest = mediaFile.value;
  const bundle = bundleFile.value;
  const inventory = inventoryFile.value;
  if (candidate.sourceQueueFileSha256 !== queueFile.sha256 || queue.entries?.length !== 7320
    || candidate.senseDispositions?.length !== 7320 || candidate.currentContentReviewDecisionCounts?.PASS !== 7311
    || candidate.releaseApproved !== false || candidate.runtimeImported !== false || candidate.mediaIncluded !== false
    || candidate.eligibleSenses?.length !== 0) throw new Error("CONTENT_REVIEW_CANDIDATE_PIN_OR_GATE_FAILURE");
  if (mediaManifest.manifestVersion !== "english-vocabulary-4600-media-v2.0.0" || mediaManifest.source?.sourceId !== "ENGLISH_VOCAB_4600"
    || mediaManifest.assets?.length !== 13977 || mediaManifest.mappings?.length !== 14012
    || bundle.mappings?.length !== 14012 || bundle.target?.projectId !== TARGET.projectId || bundle.target?.branchId !== TARGET.branchId
    || bundle.target?.databaseName !== TARGET.database || bundle.target?.schema !== TARGET.schema
    || mediaManifest.source?.apkgSha256 !== "495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b"
    || inventory.records?.length !== 4673 || oxfordFile.sha256 !== "72cac30706d097d2117595b38915d30683822b79626bc0334bde33dc15753658"
    || oxfordFile.value.records?.length !== 5004
    || sha256(readFileSync(path.resolve(ROOT, mediaManifest.source.sourceInventoryPath))) !== sha256(readFileSync(INVENTORY_PATH))) {
    throw new Error("SOURCE_MEDIA_MANIFEST_PIN_FAILURE");
  }
  const dispositions = new Map(candidate.senseDispositions.map((row) => [row.proposalKey, row]));
  const entries = new Map(queue.entries.map((row) => [row.proposalKey, row]));
  const pass = candidate.senseDispositions.filter((row) => row.contentReviewDecision === "PASS" && row.identityAndSourceValid === true && row.versionSelectionResolved === true);
  if (pass.length !== 7311 || new Set(pass.map((row) => row.proposalKey)).size !== pass.length) throw new Error("REVIEWED_SCOPE_NOT_7311_UNIQUE_SENSES");
  const receipts = new Map();
  const receiptCache = new Map();
  for (const disposition of pass) {
    if (!entries.has(disposition.proposalKey) || !/^[0-9a-f]{64}$/u.test(disposition.effectiveContentHash)) throw new Error("CANDIDATE_SENSE_NOT_IN_PINNED_QUEUE");
    if (disposition.rightsStatus !== "UNKNOWN_REVIEW_REQUIRED" || disposition.releaseEligible !== false) throw new Error("PUBLIC_RIGHTS_OR_RELEASE_GATE_CHANGED");
    receipts.set(disposition.proposalKey, validateReceipt(disposition, receiptCache));
  }
  const assetByHash = new Map(mediaManifest.assets.map((row) => [row.media_sha256, row]));
  const sourceRecords = new Map(inventory.records.map((row) => [String(row.sourceRecordId), row]));
  if (assetByHash.size !== 13977 || sourceRecords.size !== 4673) throw new Error("MEDIA_SOURCE_IDENTITY_DUPLICATE");
  const shaSidecar = readFileSync(path.join(MEDIA_WORKSPACE, "media-mapping-bundle-v1.json.sha256"), "utf8").trim().split(/\s+/u)[0];
  if (shaSidecar !== bundleFile.sha256) throw new Error("MEDIA_MAPPING_BUNDLE_SIDECAR_MISMATCH");
  return { queueFile, candidateFile, mediaFile, bundleFile, inventoryFile, oxfordFile, queue, candidate, mediaManifest, bundle, inventory, oxfordInventory: oxfordFile.value, pass, dispositions, entries, receipts, assetByHash, sourceRecords };
}

function verifySourceIdentity(mapping, pins) {
  const record = pins.sourceRecords.get(String(mapping.source_note_id));
  return Boolean(record && record.sourceNoteGuid === mapping.source_note_guid
    && record.recordEvidenceSha256 === mapping.source_record_evidence_sha256);
}

function buildMediaRows(stagingRows, mediaRows, assetRows, mediaReviewRows, rightsRows, pins) {
  const oxfordById = new Map(pins.oxfordInventory.records.map((row) => [String(row.sourceRecordId), row]));
  const senses = stagingRows.map((row) => {
    const sourceProvenance = fromJson(row.source_provenance) ?? {};
    const rawRefs = [
      ...(sourceProvenance.sourceEvidenceReferences ?? []),
      ...(sourceProvenance.stagingResolution?.sourceRecords ?? []),
      ...(sourceProvenance.stagingResolution?.supportingSourceRecords ?? [])
    ];
    const pinned = new Map();
    for (const ref of rawRefs) {
      if (ref.corpus !== "OXFORD_5000" || !ref.sourceRecordId || !ref.sourceNoteGuid || !/^[0-9a-f]{64}$/u.test(ref.recordEvidenceSha256 ?? "")) continue;
      const source = oxfordById.get(String(ref.sourceRecordId));
      if (!source || source.sourceNoteGuid !== ref.sourceNoteGuid || source.recordEvidenceSha256 !== ref.recordEvidenceSha256
        || normalized(source.normalizedHeadword ?? source.headwordText) !== normalized(row.headword)
        || !(source.sourcePosClassesCandidate ?? []).map(normalizePos).includes(sourcePosForMaster(row.part_of_speech))) continue;
      pinned.set(String(source.sourceRecordId), { ref, source });
    }
    const cefrValues = new Set([...pinned.values()].flatMap(({ source }) => (source.sourceCefrEvidence ?? []).map((item) => String(item.value ?? "").trim()).filter(Boolean)));
    const tagValues = new Set([...pinned.values()].flatMap(({ source }) => (source.sourceTags ?? []).map((item) => String(item).trim()).filter(Boolean)));
    const sourceMeaningValues = new Set([...pinned.values()]
      .map(({ source }) => plainSourceText(source.sourceFields?.Vietnamese))
      .filter(Boolean));
    const sourceMeaningVi = [...sourceMeaningValues].join("; ") || null;
    const cefr = cefrValues.size === 1 ? [...cefrValues][0] : null;
    const tags = [...tagValues].sort((a, b) => a.localeCompare(b));
    return {
      ...row,
      examples: fromJson(row.examples),
      source_provenance: {
        ...sourceProvenance,
        developmentMetadataEvidence: {
          cefr: cefr ? [...pinned.values()].flatMap(({ ref, source }) => (source.sourceCefrEvidence ?? []).filter((item) => item.value === cefr).map((item) => ({ corpus: "OXFORD_5000", sourceRecordId: String(source.sourceRecordId), sourceNoteGuid: source.sourceNoteGuid, recordEvidenceSha256: ref.recordEvidenceSha256, sourceField: item.sourceField, value: cefr }))) : [],
          tags: tags.map((tag) => ({ tag, evidence: [...pinned.values()].filter(({ source }) => (source.sourceTags ?? []).includes(tag)).map(({ ref, source }) => ({ corpus: "OXFORD_5000", sourceRecordId: String(source.sourceRecordId), sourceNoteGuid: source.sourceNoteGuid, recordEvidenceSha256: ref.recordEvidenceSha256 })) }))
        }
      },
      cefr,
      tags,
      source_meaning_vi: sourceMeaningVi
    };
  });
  const sensesByKey = new Map(senses.map((row) => [row.proposal_key, row]));
  const sensesByLemmaPos = new Map();
  for (const sense of senses) {
    const key = `${normalized(sense.headword)}\u0000${sourcePosForMaster(sense.part_of_speech)}`;
    if (!sensesByLemmaPos.has(key)) sensesByLemmaPos.set(key, []);
    sensesByLemmaPos.get(key).push(sense);
  }
  const assetsByHash = new Map(assetRows.map((row) => [row.media_sha256, row]));
  const mappingByKey = new Map(mediaRows.map((row) => [row.mapping_key, row]));
  const rightsByHash = new Map(rightsRows.map((row) => [row.media_sha256, row]));
  const decisions = new Map();
  for (const row of mediaReviewRows) {
    const current = decisions.get(row.mapping_key);
    if (!current || new Date(row.reviewed_at).getTime() > new Date(current.reviewed_at).getTime()) decisions.set(row.mapping_key, row);
  }
  const bundleMappings = new Map(pins.bundle.mappings.map((row) => [row.mappingKey, row]));
  if (mappingByKey.size !== 14012 || assetsByHash.size !== 13977 || bundleMappings.size !== 14012 || rightsByHash.size !== 13977) throw new Error("MEDIA_STAGING_COUNTS_CHANGED");
  for (const row of mediaRows) {
    const local = bundleMappings.get(row.mapping_key);
    const asset = assetsByHash.get(row.media_sha256);
    if (!local || !asset || local.mediaSha256 !== row.media_sha256 || local.mappingStatus !== row.mapping_status
      || local.targetSnapshotFingerprint !== row.target_snapshot_fingerprint || !verifySourceIdentity(row, pins)) throw new Error("MEDIA_STAGING_SOURCE_IDENTITY_MISMATCH");
    const localAsset = pins.assetByHash.get(row.media_sha256);
    if (!localAsset || asset.detected_mime_type !== localAsset.detected_mime_type || Number(asset.byte_length) !== localAsset.byte_length) throw new Error("MEDIA_ASSET_HASH_METADATA_MISMATCH");
  }
  for (const sense of senses) sense.development_media = { images: [], wordAudio: [], exampleAudio: [] };
  const pronunciationsByLexemePos = new Map();
  for (const row of mediaRows) {
    if (row.media_kind !== "WORD_PRONUNCIATION_AUDIO") continue;
    const evidence = fromJson(row.mapping_evidence) ?? {};
    if (evidence.sourceNoteIdentityVerified !== true || !verifySourceIdentity(row, pins)) continue;
    const record = pins.sourceRecords.get(String(row.source_note_id));
    const fields = record?.sourceFields ?? {};
    const ipa = plainSourceText(fields.IPA ?? fields.ipa ?? "");
    const lemma = normalized(evidence.sourceLemma);
    const posClasses = (evidence.sourcePosClasses ?? []).map(normalizePos);
    const key = `${lemma}\u0000${[...new Set(posClasses)].sort().join(",")}`;
    if (!pronunciationsByLexemePos.has(key)) pronunciationsByLexemePos.set(key, new Set());
    if (ipa) pronunciationsByLexemePos.get(key).add(ipa);
  }
  const mediaSnapshot = pins.bundle.target.snapshotFingerprint;
  for (const mapping of mediaRows) {
    const evidence = fromJson(mapping.mapping_evidence) ?? {};
    if (mapping.target_snapshot_fingerprint !== mediaSnapshot || evidence.sourceNoteIdentityVerified !== true || !verifySourceIdentity(mapping, pins)) continue;
    const asset = assetsByHash.get(mapping.media_sha256);
    const rights = rightsByHash.get(mapping.media_sha256);
    if (!asset || !rights || rights.rights_status === "RESTRICTED" || rights.rights_status !== "UNKNOWN_REVIEW_REQUIRED"
      || asset.rights_status !== "UNKNOWN_REVIEW_REQUIRED" || !String(asset.validation_status).startsWith("VALID_")) continue;
    const source = pins.sourceRecords.get(String(mapping.source_note_id));
    const fields = source?.sourceFields ?? {};
    const note = noteIdentity(mapping);
    const review = decisions.get(mapping.mapping_key);
    const baseMedia = { url: mediaUrl(mapping.media_sha256), mediaSha256: mapping.media_sha256, mimeType: asset.detected_mime_type, sourceNoteIdentity: note, rightsStatus: "UNKNOWN_REVIEW_REQUIRED" };

    if (mapping.media_kind === "ILLUSTRATION_IMAGE") {
      const sense = sensesByKey.get(mapping.target_sense_proposal_key);
      const candidateKeys = new Set([mapping.target_sense_proposal_key, ...(evidence.candidateProposalKeysPendingSelection ?? []), ...(evidence.effectiveSourceEvidenceProposalKeys ?? [])].filter(Boolean));
      const direct = sense && candidateKeys.has(sense.proposal_key) && mapping.target_content_fingerprint === sense.effective_content_hash
        && mapping.mapping_status === "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW"
        && evidence.semanticComparison?.winnerProposalKey === sense.proposal_key && asset.detected_mime_type?.startsWith("image/");
      if (!direct) continue;
      let reviewStatus = "PROPOSED";
      if (review?.outcome === "ACCEPT_MAPPING" && review.target_sense_proposal_key === sense.proposal_key
        && review.target_content_fingerprint === sense.effective_content_hash && review.target_snapshot_fingerprint === mediaSnapshot) reviewStatus = "ACCEPTED_MAPPING";
      else if (review) continue;
      const item = { ...baseMedia, reviewStatus, mappingEvidence: "Pinned source note meaning and POS; image still requires visual review." };
      sense.development_media.images.push(item);
      continue;
    }

    if (mapping.media_kind === "WORD_PRONUNCIATION_AUDIO") {
      if (mapping.mapping_status !== "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION" || asset.detected_mime_type !== "audio/mpeg") continue;
      const lemma = normalized(evidence.sourceLemma);
      if (mapping.target_lexeme_identity !== `NORMALIZED_HEADWORD:${lemma}`) continue;
      const sourcePos = new Set((evidence.sourcePosClasses ?? []).map(normalizePos));
      const pronunciation = plainSourceText(fields.IPA ?? fields.ipa ?? "");
      for (const posClass of sourcePos) {
        const candidates = sensesByLemmaPos.get(`${lemma}\u0000${posClass}`) ?? [];
        for (const sense of candidates) {
        if (review && !(new Set(["EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT"])).has(review.outcome)
          || review && review.target_lexeme_identity !== mapping.target_lexeme_identity) continue;
        const profileKey = `${lemma}\u0000${[...new Set([...sourcePos])].sort().join(",")}`;
        const variantCount = pronunciationsByLexemePos.get(profileKey)?.size ?? 0;
        const reviewStatus = variantCount > 1 || !pronunciation ? "AMBIGUOUS" : review ? "ACCEPTED_MAPPING" : "PROPOSED";
        const item = { ...baseMedia, reviewStatus, pronunciationEvidence: evidence.pronunciationEvidence ?? "SOURCE_NOTE_AUDIO_REFERENCE", ...(pronunciation ? { pronunciation } : {}), mappingEvidence: "Source note identity, normalized lemma, POS class, and pronunciation reference match the Lexeme." };
        sense.development_media.wordAudio.push(item);
        }
      }
      continue;
    }

    if (mapping.media_kind === "EXAMPLE_SENTENCE_AUDIO") {
      if (!review || !["EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"].includes(review.outcome) || asset.detected_mime_type !== "audio/mpeg") continue;
      const sense = sensesByKey.get(review.target_sense_proposal_key);
      if (!sense || mapping.target_content_fingerprint !== sense.effective_content_hash || review.target_content_fingerprint !== sense.effective_content_hash
        || review.target_snapshot_fingerprint !== mediaSnapshot) continue;
      const targetExample = (sense.examples ?? []).find((example, index) => (example.exampleKey ?? `${sense.proposal_key}:example-${index + 1}`) === review.target_example_key);
      if (!targetExample) continue;
      const textMatch = classifyExampleText(fields.Example ?? fields.example ?? "", targetExample.en ?? "");
      if (textMatch !== review.outcome || !["EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"].includes(textMatch)) continue;
      sense.development_media.exampleAudio.push({ ...baseMedia, reviewStatus: "ACCEPTED_MAPPING", exampleKey: review.target_example_key });
    }
  }
  for (const sense of senses) {
    for (const kind of ["images", "wordAudio", "exampleAudio"]) {
      const unique = new Map(sense.development_media[kind].map((item) => [item.mediaSha256, item]));
      sense.development_media[kind] = [...unique.values()].sort((a, b) => a.mediaSha256.localeCompare(b.mediaSha256));
    }
  }
  return senses;
}

function buildSnapshotPayload(rows, pins, targetIdentity) {
  const identities = rows.map((row) => ({ proposalKey: row.proposal_key, contentSha256: row.effective_content_hash })).sort((a, b) => a.proposalKey.localeCompare(b.proposalKey));
  const projectionFingerprint = sha256(stable(identities));
  return {
    artifactType: "VOCABFLOW_MASTER_V2_DEVELOPMENT_RUNTIME_SNAPSHOT",
    artifactVersion: 1,
    sourceQueuePath: path.relative(ROOT, QUEUE_PATH).replaceAll("\\", "/"),
    sourceQueueSha256: pins.queueFile.sha256,
    releaseCandidatePath: path.relative(ROOT, CANDIDATE_PATH).replaceAll("\\", "/"),
    releaseCandidateSha256: pins.candidateFile.sha256,
    sourceMediaManifestSha256: pins.mediaFile.sha256,
    sourceMediaMappingBundleSha256: pins.bundleFile.sha256,
    stagingTarget: targetIdentity,
    includedSenseCount: rows.length,
    excludedNonPassCount: 9,
    status: "EFFECTIVE_DRAFT_CONTENT_REVIEW_PASS_RIGHTS_UNKNOWN_DEVELOPMENT_ONLY",
    editorialStatus: "DRAFT",
    approvalGranted: false,
    releaseEligible: false,
    rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
    identities,
    projectionFingerprint
  };
}

async function main() {
  const env = process.env;
  await verifyProviderTarget(env);
  const pins = validateArtifacts();
  const bootstrap = postgres(env.BOOTSTRAP_DATABASE_URL, { max: 1, prepare: false, onnotice: () => undefined });
  const migration = postgres(env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    const targetRows = await bootstrap`SELECT current_database() AS database_name, current_user AS role_name,
      (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
      (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id,
      (SELECT environment::text FROM vocabflow_meta.environment_identity WHERE id = 1) AS environment`;
    const target = targetRows[0];
    if (target?.database_name !== TARGET.database || target.project_id !== TARGET.projectId || target.branch_id !== TARGET.branchId || target.environment !== "development") throw new Error("POST_CONNECT_DEVELOPMENT_TARGET_MISMATCH");
    const keys = pins.pass.map((row) => row.proposalKey);
    const staging = await bootstrap.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const baseline = await tx`SELECT
        (SELECT count(*)::int FROM vocabflow_editorial_staging.identity_registry) AS identities,
        (SELECT count(*)::int FROM vocabflow_editorial_staging.identity_registry WHERE resolution_status = 'EFFECTIVE') AS effective,
        (SELECT count(*)::int FROM vocabflow_editorial_staging.identity_registry WHERE resolution_status = 'PENDING_CONTENT_VALIDATION') AS pending_content,
        (SELECT count(*)::int FROM vocabflow_editorial_staging.identity_registry WHERE resolution_status = 'PENDING_VERSION_DECISION') AS pending_version`;
      if (baseline[0]?.identities !== 7473 || baseline[0]?.effective !== 7320) throw new Error("STAGING_IDENTITY_BASELINE_CHANGED");
      const senses = await tx`SELECT i.proposal_key, i.source_group_key, i.resolution_status, i.effective_content_hash AS identity_hash,
        d.headword, d.display_form, d.part_of_speech, d.definition_en, d.meaning_vi, d.examples, d.usage_notes,
        d.source_provenance, d.effective_content_hash AS draft_hash, d.effective_content_hash AS effective_content_hash, d.editorial_status, d.rights_status, d.batch_id
        FROM vocabflow_editorial_staging.identity_registry i
        JOIN vocabflow_editorial_staging.draft_proposals d USING (proposal_key)
        WHERE i.proposal_key = ANY(${keys}::text[]) ORDER BY i.proposal_key`;
      const events = await tx`SELECT event_id::text AS event_id, event_sha256, proposal_key, effective_content_hash, decision,
        reviewer_identity, receipt_path, receipt_sha256, receipt_checkpoint_at, evidence,
        rights_status, approval_granted, release_eligible
        FROM vocabflow_editorial_staging.independent_content_review_events_v1
        WHERE proposal_key = ANY(${keys}::text[]) AND decision = 'PASS'`;
      return { baseline: baseline[0], senses, events };
    });
    if (staging.senses.length !== 7311) throw new Error("CURRENT_EFFECTIVE_SENSE_COUNT_MISMATCH");
    const eventMap = new Map();
    for (const event of staging.events) {
      const key = `${event.proposal_key}\u0000${event.effective_content_hash}`;
      if (!eventMap.has(key)) eventMap.set(key, []);
      eventMap.get(key).push(event);
    }
    const dispositionByKey = pins.dispositions;
    const receiptByKey = pins.receipts;
    const queueByKey = pins.entries;
    const queuePosition = new Map(pins.queue.entries.map((entry, index) => [entry.proposalKey, index + 1]));
    for (const row of staging.senses) {
      const disposition = dispositionByKey.get(row.proposal_key);
      const receipt = receiptByKey.get(row.proposal_key);
      if (!disposition || row.resolution_status !== "EFFECTIVE" || row.editorial_status !== "DRAFT"
        || row.identity_hash !== disposition.effectiveContentHash || row.draft_hash !== disposition.effectiveContentHash
        || row.source_group_key !== disposition.sourceGroupKey || row.headword !== disposition.headword || row.part_of_speech !== disposition.partOfSpeech
        || row.rights_status !== "UNKNOWN_REVIEW_REQUIRED") throw new Error("CURRENT_STAGING_CONTENT_HASH_OR_IDENTITY_MISMATCH");
      const event = (eventMap.get(`${row.proposal_key}\u0000${row.draft_hash}`) ?? []).find((candidate) => {
        const evidence = fromJson(candidate.evidence) ?? {};
        const reviewed = evidence.entry ?? {};
        return candidate.reviewer_identity === disposition.reviewerIdentity
          && candidate.receipt_path === receipt.path
          && (reviewed.decision ?? reviewed.verdict ?? reviewed.disposition ?? reviewed.revisedDecision) === "PASS"
          && reviewed.effectiveContentHash === row.draft_hash
          && candidate.rights_status === "UNKNOWN_REVIEW_REQUIRED"
          && candidate.approval_granted === false && candidate.release_eligible === false;
      });
      if (!event) throw new Error("NEON_REVIEW_RECEIPT_READBACK_MISMATCH");
      row.reviewer_identity = disposition.reviewerIdentity;
      row.review_receipt_path = receipt.path;
      row.review_receipt_sha256 = receipt.sha256;
      const priorProvenance = fromJson(row.source_provenance) ?? {};
      row.source_provenance = { ...priorProvenance, developmentReviewReceiptAudit: {
        eventId: event.event_id, eventSha256: event.event_sha256, receiptSha256AtSync: event.receipt_sha256,
        receiptSha256CurrentLocal: receipt.sha256, receiptPath: receipt.path, reviewerIdentity: event.reviewer_identity,
        receiptCheckpointAt: event.receipt_checkpoint_at
      } };
      const queued = queueByKey.get(row.proposal_key);
      if (!queued || queued.headword !== row.headword || queued.partOfSpeech !== row.part_of_speech) throw new Error("SOURCE_QUEUE_IDENTITY_MISMATCH");
      const examples = fromJson(row.examples);
      if (!Array.isArray(examples) || examples.length === 0 || !row.definition_en || !row.meaning_vi || !row.source_provenance) throw new Error("CURRENT_STAGING_CONTENT_SCHEMA_FAILURE");
    }
    const mediaReadback = await migration.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const [assets, mappings, mapReviews, rights] = await Promise.all([
        tx`SELECT * FROM vocabflow_editorial_staging.media_assets_v2`,
        tx`SELECT * FROM vocabflow_editorial_staging.media_mappings_v2`,
        tx`SELECT * FROM vocabflow_editorial_staging.media_mapping_review_events_v1`,
        tx`SELECT media_sha256, rights_status FROM vocabflow_editorial_staging.media_rights_v1`
      ]);
      return { assets, mappings, mapReviews, rights };
    });
    const importedRows = buildMediaRows(staging.senses, mediaReadback.mappings, mediaReadback.assets, mediaReadback.mapReviews, mediaReadback.rights, pins);
    const snapshot = buildSnapshotPayload(importedRows, pins, { projectId: TARGET.projectId, branchId: TARGET.branchId, database: TARGET.database, schema: TARGET.schema });
    const snapshotSha = sha256(stable(snapshot));
    if (process.argv.includes("--check")) {
      const current = await migration`SELECT count(*)::int AS count FROM vocabflow_app.master_v2_development_projections`;
      console.log(`DRY_RUN=PASS`);
      console.log(`TARGET=${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}`);
      console.log(`VALIDATED_SENSES=${importedRows.length}`);
      console.log(`SNAPSHOT_FINGERPRINT=${snapshot.projectionFingerprint}`);
      console.log(`EXISTING_PROJECTIONS=${current[0]?.count ?? 0}`);
      return;
    }
    const runtimeBefore = await migration`SELECT
      count(*) FILTER (WHERE source_dataset IS DISTINCT FROM ${V2_SOURCE})::int AS legacy_vocabularies,
      count(*) FILTER (WHERE source_dataset = ${V2_SOURCE})::int AS existing_v2_vocabularies,
      (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress_rows,
      (SELECT count(*)::int FROM vocabflow_app.review_events) AS review_rows
      FROM vocabflow_app.vocabularies`;
    const before = runtimeBefore[0];
    if (before.legacy_vocabularies !== 2126 || before.progress_rows !== 88 || before.review_rows !== 230) throw new Error("RUNTIME_PRESERVATION_BASELINE_MISMATCH");
    const existing = await migration`SELECT p.proposal_key, p.vocabulary_id, p.content_sha256, v.source_dataset, v.source_record_id
      FROM vocabflow_app.master_v2_development_projections p JOIN vocabflow_app.vocabularies v ON v.id = p.vocabulary_id
      ORDER BY p.proposal_key`;
    const rowByKey = new Map(importedRows.map((row) => [row.proposal_key, row]));
    for (const row of existing) {
      const input = rowByKey.get(row.proposal_key);
      if (!input || row.content_sha256 !== input.effective_content_hash || row.source_dataset !== V2_SOURCE) throw new Error("EXISTING_V2_PROJECTION_CONFLICT");
      rowByKey.delete(row.proposal_key);
    }
    const pending = importedRows.filter((row) => rowByKey.has(row.proposal_key));
    let metadataUpdateCount = 0;
    const payload = pending.map((row) => ({
      proposalKey: row.proposal_key, sourceGroupKey: row.source_group_key, sourceRecordId: queuePosition.get(row.proposal_key),
      word: row.display_form || row.headword, vietnamese: row.meaning_vi, definitionEn: row.definition_en,
      exampleEn: row.examples[0]?.en ?? null, contentVersion: 1, partOfSpeech: row.part_of_speech,
      cefr: row.cefr, tags: row.tags, examples: row.examples, usageNotes: row.usage_notes,
      sourceProvenance: { ...row.source_provenance, masterV2Identity: { proposalKey: row.proposal_key, headword: row.headword, displayForm: row.display_form || row.headword, sourceGroupKey: row.source_group_key, ...(row.source_meaning_vi ? { sourceMeaningVi: row.source_meaning_vi } : {}) } },
      contentSha256: row.effective_content_hash, reviewerIdentity: row.reviewer_identity, reviewReceiptPath: row.review_receipt_path,
      reviewReceiptSha256: row.review_receipt_sha256, developmentMedia: row.development_media
    }));
    await migration.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('vocabflow-master-v2-development-import-v1'))`;
      const beforeProjection = await tx`SELECT proposal_key, content_sha256 FROM vocabflow_app.master_v2_development_projections`;
      const beforeMap = new Map(beforeProjection.map((row) => [row.proposal_key, row.content_sha256]));
      for (const item of pending) if (beforeMap.has(item.proposal_key)) throw new Error("V2_IMPORT_CONCURRENT_REPLAY");
      const orphan = await tx`SELECT count(*)::int AS count FROM vocabflow_app.vocabularies v
        LEFT JOIN vocabflow_app.master_v2_development_projections p ON p.vocabulary_id = v.id
        WHERE v.source_dataset = ${V2_SOURCE} AND p.vocabulary_id IS NULL`;
      if (orphan[0]?.count !== 0) throw new Error("V2_IMPORT_ORPHAN_VOCABULARY_EXISTS");
      if (payload.length > 0) {
        await tx`WITH input AS (
          SELECT * FROM jsonb_to_recordset(${tx.json(payload)}) AS x(
            "proposalKey" text, "sourceGroupKey" text, "sourceRecordId" integer, word text, vietnamese text,
            "definitionEn" text, "exampleEn" text, "contentVersion" integer, "partOfSpeech" text, cefr text,
            tags jsonb, examples jsonb, "usageNotes" text, "sourceProvenance" jsonb, "contentSha256" text,
            "reviewerIdentity" text, "reviewReceiptPath" text, "reviewReceiptSha256" text, "developmentMedia" jsonb
          )
        ), inserted AS (
          INSERT INTO vocabflow_app.vocabularies (word, vietnamese, definition_en, example_en, enabled, content_version, source_dataset, source_record_id)
          SELECT word, vietnamese, "definitionEn", "exampleEn", true, "contentVersion", ${V2_SOURCE}, "sourceRecordId"
          FROM input ORDER BY "sourceRecordId"
          RETURNING id, source_record_id
        ), resolved AS (
          SELECT i.*, inserted.id AS vocabulary_id
          FROM input i JOIN inserted ON inserted.source_record_id = i."sourceRecordId"
        )
        INSERT INTO vocabflow_app.master_v2_development_projections (
          proposal_key, source_group_key, vocabulary_id, part_of_speech, cefr, tags, examples, usage_notes,
          source_provenance, content_sha256, reviewer_identity, review_receipt_path, review_receipt_sha256,
          content_review_decision, editorial_status, rights_status, development_media
        )
        SELECT "proposalKey", "sourceGroupKey", vocabulary_id, "partOfSpeech", cefr, tags, examples, "usageNotes",
          "sourceProvenance", "contentSha256", "reviewerIdentity", "reviewReceiptPath", "reviewReceiptSha256",
          'PASS', 'DRAFT', 'UNKNOWN_REVIEW_REQUIRED', "developmentMedia"
        FROM resolved
        ON CONFLICT (proposal_key) DO NOTHING`;
      }
      const metadataPayload = importedRows.map((row) => ({
        proposalKey: row.proposal_key,
        contentSha256: row.effective_content_hash,
        cefr: row.cefr,
        tags: row.tags,
        sourceMeaningVi: row.source_meaning_vi,
        developmentMetadataEvidence: row.source_provenance.developmentMetadataEvidence ?? { cefr: [], tags: [] }
      }));
      const metadataUpdate = await tx`WITH input AS (
        SELECT * FROM jsonb_to_recordset(${tx.json(metadataPayload)}) AS x(
          "proposalKey" text, "contentSha256" text, cefr text, tags jsonb, "sourceMeaningVi" text, "developmentMetadataEvidence" jsonb
        )
      )
      UPDATE vocabflow_app.master_v2_development_projections p
      SET cefr = input.cefr,
          tags = COALESCE(input.tags, '[]'::jsonb),
          source_provenance = jsonb_set(
            jsonb_set(p.source_provenance, '{developmentMetadataEvidence}', input."developmentMetadataEvidence", true),
            '{masterV2Identity}',
            COALESCE(p.source_provenance->'masterV2Identity', '{}'::jsonb) || jsonb_build_object('sourceMeaningVi', input."sourceMeaningVi"),
            true
          )
      FROM input
      WHERE p.proposal_key = input."proposalKey"
        AND p.content_sha256 = input."contentSha256"
        AND p.content_review_decision = 'PASS'
        AND p.editorial_status = 'DRAFT'
        AND p.rights_status = 'UNKNOWN_REVIEW_REQUIRED'
        AND (p.cefr IS DISTINCT FROM input.cefr
          OR p.tags IS DISTINCT FROM COALESCE(input.tags, '[]'::jsonb)
          OR p.source_provenance->'masterV2Identity'->>'sourceMeaningVi' IS DISTINCT FROM input."sourceMeaningVi"
          OR p.source_provenance->'developmentMetadataEvidence' IS DISTINCT FROM input."developmentMetadataEvidence")
      RETURNING p.proposal_key`;
      metadataUpdateCount = metadataUpdate.length;
      const afterCount = await tx`SELECT count(*)::int AS count FROM vocabflow_app.master_v2_development_projections`;
      if (afterCount[0]?.count !== 7311) throw new Error(`DEVELOPMENT_PROJECTION_COUNT_MISMATCH_${afterCount[0]?.count ?? "NULL"}`);
      const conflicts = await tx`SELECT count(*)::int AS count FROM vocabflow_app.master_v2_development_projections p
        JOIN jsonb_to_recordset(${tx.json(importedRows.map((row) => ({ proposalKey: row.proposal_key, hash: row.effective_content_hash })))}) AS i("proposalKey" text, hash text)
        ON p.proposal_key = i."proposalKey" WHERE p.content_sha256 <> i.hash OR p.content_review_decision <> 'PASS'
        OR p.editorial_status <> 'DRAFT' OR p.rights_status <> 'UNKNOWN_REVIEW_REQUIRED'`;
      if (conflicts[0]?.count !== 0) throw new Error("DEVELOPMENT_PROJECTION_CONTENT_CONFLICT");
      const metadataMismatch = await tx`SELECT count(*)::int AS count
        FROM vocabflow_app.master_v2_development_projections p
        JOIN jsonb_to_recordset(${tx.json(metadataPayload)}) AS i("proposalKey" text, "contentSha256" text, cefr text, tags jsonb, "sourceMeaningVi" text, "developmentMetadataEvidence" jsonb)
          ON p.proposal_key = i."proposalKey"
        WHERE p.content_sha256 <> i."contentSha256"
          OR p.cefr IS DISTINCT FROM i.cefr
          OR p.tags IS DISTINCT FROM COALESCE(i.tags, '[]'::jsonb)
          OR p.source_provenance->'masterV2Identity'->>'sourceMeaningVi' IS DISTINCT FROM i."sourceMeaningVi"
          OR p.source_provenance->'developmentMetadataEvidence' IS DISTINCT FROM i."developmentMetadataEvidence"
          OR p.editorial_status <> 'DRAFT' OR p.rights_status <> 'UNKNOWN_REVIEW_REQUIRED'`;
      if (metadataMismatch[0]?.count !== 0) throw new Error("DEVELOPMENT_METADATA_READBACK_MISMATCH");
      await tx`INSERT INTO vocabflow_app.master_v2_development_import_runs (
        snapshot_fingerprint, source_queue_sha256, release_candidate_sha256, projection_fingerprint, imported_sense_count,
        target_project_id, target_branch_id, target_database
      ) VALUES (${snapshotSha}, ${pins.queueFile.sha256}, ${pins.candidateFile.sha256}, ${snapshot.projectionFingerprint}, 7311,
        ${TARGET.projectId}, ${TARGET.branchId}, ${TARGET.database}) ON CONFLICT (snapshot_fingerprint) DO NOTHING`;
    });
    const after = await migration`SELECT
      count(*) FILTER (WHERE source_dataset IS DISTINCT FROM ${V2_SOURCE})::int AS legacy_vocabularies,
      count(*) FILTER (WHERE source_dataset = ${V2_SOURCE})::int AS v2_vocabularies,
      (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress_rows,
      (SELECT count(*)::int FROM vocabflow_app.review_events) AS review_rows,
      (SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS projection_rows,
      (SELECT count(*)::int FROM vocabflow_app.master_v2_development_import_runs) AS import_runs
      FROM vocabflow_app.vocabularies`;
    if (after[0]?.legacy_vocabularies !== before.legacy_vocabularies || after[0]?.progress_rows !== before.progress_rows || after[0]?.review_rows !== before.review_rows
      || after[0]?.v2_vocabularies !== 7311 || after[0]?.projection_rows !== 7311) throw new Error("RUNTIME_OR_IMPORT_READBACK_FAILURE");
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    writeFileSync(`${SNAPSHOT_PATH}.sha256`, `${sha256(readFileSync(SNAPSHOT_PATH))}  ${path.basename(SNAPSHOT_PATH)}\n`, "utf8");
    console.log("DEVELOPMENT_IMPORT=PASS");
    console.log(`TARGET=${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}`);
    console.log(`V2_PROJECTIONS=${after[0].projection_rows}`);
    console.log(`NEWLY_INSERTED=${pending.length}`);
    console.log(`CONTENT_FINGERPRINT=${snapshot.projectionFingerprint}`);
    console.log(`SNAPSHOT_SHA256=${snapshotSha}`);
    console.log(`LEGACY_VOCABULARIES_PRESERVED=${after[0].legacy_vocabularies}`);
    console.log(`LEARNER_PROGRESS_PRESERVED=${after[0].progress_rows}`);
    console.log(`REVIEW_EVENTS_PRESERVED=${after[0].review_rows}`);
    console.log(`MEDIA_LINKED_IMAGES=${importedRows.reduce((n, row) => n + row.development_media.images.length, 0)}`);
    console.log(`MEDIA_LINKED_WORD_AUDIO=${importedRows.reduce((n, row) => n + row.development_media.wordAudio.length, 0)}`);
    console.log(`MEDIA_LINKED_EXAMPLE_AUDIO=${importedRows.reduce((n, row) => n + row.development_media.exampleAudio.length, 0)}`);
    console.log(`CEFR_METADATA_MAPPED=${importedRows.filter((row) => row.cefr !== null).length}`);
    console.log(`METADATA_ROWS_UPDATED=${metadataUpdateCount}`);
  } finally {
    await Promise.all([bootstrap.end({ timeout: 5 }), migration.end({ timeout: 5 })]);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "DEVELOPMENT_IMPORT_FAILED";
  const safeMessage = message.replace(/postgres(?:ql)?:\/\/[^\s]+/giu, "[connection redacted]");
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/u.test(safeMessage) ? safeMessage : `DEVELOPMENT_IMPORT_FAILED: ${safeMessage.slice(0, 180)}`);
  process.exitCode = 1;
});
