import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import type { Sql } from "postgres";
import { assertPostConnectIdentity, openSql } from "./db-core";
import { createNeonApiClient } from "./neon-target-verifier";
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection } from "./production-release-safety";
import { DATABASE_TARGETS } from "../config/database-targets";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA_DIR = resolve(ROOT, ".vocabflow-local/cloudinary-v2-migration");
const SOURCE_DIR = resolve(ROOT, "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2");
const INVENTORY_PATH = resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/vocab4600-normalized-inventory.json");
const EXPECTED = {
  projectId: "silent-sky-84582895",
  branchId: "br-cool-sea-a1ifkf95",
  databaseName: "neondb",
  senses: 7311,
  fingerprint: "9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367",
  mappingBundleSha256: "7bb52fbae0e329b00b8d1713e2959c888bc2cc5b82496403682a3d1dd213c068",
  sourceManifestSha256: "ded291c07663defb597fb1465644f8a63b85c57620f2eda2b4ef3485f52f83c6",
  sourceRightsSha256: "dc3e933b06b72fa0be681e040b69c28c1df32d6736023238dbc3c911cf4cd9d8",
  inventorySha256: "deb450bca71ce918eee2efbdac4e3fbd82081a986359d79277b863cc4b6ca0a9",
  backfillManifestSha256: "24dede831d51e9eeb52597e788c919ecaae21b6e189a523593f1bf3059900674",
  uploadMapSha256: "549e832a72927ab5adea2ce45b5da5376db233790eae0579cbc5e6824e799ec6",
  apkgSha256: "495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Version-pinned historical artifact/SQL adapter; runtime target and source-pin validation remain mandatory.
type Json = Record<string, any>;
type ProjectionRow = {
  proposal_key: string;
  vocabulary_id: number;
  part_of_speech: string;
  content_sha256: string;
  content_review_decision: string;
  editorial_status: string;
  rights_status: string;
  source_provenance: unknown;
  development_media: Json;
  word: string;
  definition_en: string | null;
  enabled: boolean;
};
type Candidate = {
  mappingKey: string;
  mediaSha256: string;
  sourceFilename: string;
  sourceNoteId: string;
  sourceNoteGuid: string;
  sourceRecordEvidenceSha256: string;
  sourceLemma: string;
  sourcePos: string[];
  targetProposalKey: string;
  targetContentSha256: string;
  targetVocabularyId: number;
  targetPartOfSpeech: string;
  mappingConfidence: number;
  evidence: Json;
  resolution: "PINNED_SOURCE_PROPOSAL" | "CONSERVATIVE_PENDING_CANDIDATE";
};

const IMAGE_KIND = "ILLUSTRATION_IMAGE";
const IMAGE_MIME_EXT = new Map([["image/jpeg", new Set(["jpg", "jpeg"])], ["image/png", new Set(["png"])], ["image/webp", new Set(["webp"])], ["image/gif", new Set(["gif"])]]);
const STOP_WORDS = new Set("a an the is are was were be been being to of in on at for from with by as and or but that this these those it its you your someone something another one do does did have has had can could will would may might should must often used use when what who how which their they them he she we i not than then into about".split(" "));

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function sha256(bytes: Buffer | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function readJson<T = Json>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function verifyFile(path: string, expectedSha256: string) {
  assert(sha256(readFileSync(path)) === expectedSha256, "PINNED_SOURCE_FILE_HASH_MISMATCH");
}

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("und")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/gu, " ");
}

function normalizePos(value: unknown) {
  const key = String(value ?? "").trim().toLocaleUpperCase("und");
  return ({ N: "NOUN", V: "VERB", ADJ: "ADJECTIVE", ADV: "ADVERB", PREP: "PREPOSITION", PRON: "PRONOUN", CONJ: "CONJUNCTION", INTERJ: "INTERJECTION" } as Record<string, string>)[key] ?? key;
}

function cleanEnglish(value: unknown) {
  return String(value ?? "").replace(/<br\s*\/?\s*>/giu, " ").replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/giu, " ").replace(/&amp;/giu, "&").replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'").replace(/&lt;/giu, "<").replace(/&gt;/giu, ">")
    .normalize("NFKC").toLocaleLowerCase("und").replace(/[\p{L}\p{N}_']+/gu, (token) => `${token} `).trim().replace(/\s+/gu, " ");
}

function semanticTokens(text: unknown, lemma: string) {
  const lemmaTokens = new Set(normalize(lemma).split(" ").filter(Boolean));
  const tokens = new Set<string>();
  for (let token of cleanEnglish(text).split(" ")) {
    if (!token || STOP_WORDS.has(token) || lemmaTokens.has(token)) continue;
    if (token.length > 4 && token.endsWith("ies")) token = `${token.slice(0, -3)}y`;
    else if (token.length > 5 && token.endsWith("ing")) token = token.slice(0, -3);
    else if (token.length > 5 && token.endsWith("ed")) token = token.slice(0, -2);
    else if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) token = token.slice(0, -1);
    tokens.add(token);
  }
  return tokens;
}

export function semanticDice(sourceMeaning: unknown, targetDefinition: unknown, lemma: string) {
  const source = semanticTokens(sourceMeaning, lemma);
  const target = semanticTokens(targetDefinition, lemma);
  if (source.size === 0 || target.size === 0) return 0;
  let overlap = 0;
  for (const token of source) if (target.has(token)) overlap += 1;
  return Math.round((2 * overlap / (source.size + target.size)) * 10_000) / 10_000;
}

function sourceDefinition(record: Json) {
  const candidates = record.sourceDefinitionExampleEvidence?.englishDefinitionCandidates;
  if (!Array.isArray(candidates)) return "";
  return String(candidates.find((item: Json) => typeof item?.rawSegment === "string" && item.rawSegment.trim())?.rawSegment ?? "");
}

function hasExactSourceProvenance(value: unknown, sourceNoteId: string, sourceNoteGuid: string, evidenceSha256: string): boolean {
  if (Array.isArray(value)) return value.some((child) => hasExactSourceProvenance(child, sourceNoteId, sourceNoteGuid, evidenceSha256));
  if (!value || typeof value !== "object") return false;
  const row = value as Json;
  const id = String(row.sourceRecordId ?? row.sourceNoteId ?? "");
  const guid = String(row.sourceNoteGuid ?? row.sourceNoteGuid ?? "");
  const evidence = String(row.recordEvidenceSha256 ?? row.sourceRecordEvidenceSha256 ?? "");
  if (id === sourceNoteId && guid === sourceNoteGuid && evidence === evidenceSha256) return true;
  return Object.values(row).some((child) => hasExactSourceProvenance(child, sourceNoteId, sourceNoteGuid, evidenceSha256));
}

function stableFingerprint(rows: ProjectionRow[]) {
  const pairs = rows.map((row) => [row.proposal_key, row.content_sha256] as const).sort((left, right) => left[0].localeCompare(right[0]));
  return sha256(Buffer.from(stable(pairs)));
}

function verifySources() {
  const sourceManifestPath = resolve(SOURCE_DIR, "media-manifest-v2.json");
  const mappingBundlePath = resolve(SOURCE_DIR, "media-mapping-bundle-v1.json");
  const sourceRightsPath = resolve(SOURCE_DIR, "media-rights-ledger-v1.json");
  const backfillPath = resolve(MEDIA_DIR, "source-backfill-manifest-v1.json");
  const uploadMapPath = resolve(MEDIA_DIR, "source-backfill-upload-map-v1.json");
  verifyFile(sourceManifestPath, EXPECTED.sourceManifestSha256);
  verifyFile(mappingBundlePath, EXPECTED.mappingBundleSha256);
  verifyFile(sourceRightsPath, EXPECTED.sourceRightsSha256);
  verifyFile(INVENTORY_PATH, EXPECTED.inventorySha256);
  verifyFile(backfillPath, EXPECTED.backfillManifestSha256);
  verifyFile(uploadMapPath, EXPECTED.uploadMapSha256);
  const sourceManifest = readJson(sourceManifestPath);
  const bundle = readJson(mappingBundlePath);
  const inventory = readJson<{ records: Json[] }>(INVENTORY_PATH);
  const backfill = readJson(backfillPath);
  const uploadMap = readJson(uploadMapPath);
  assert(sourceManifest.source?.sourceId === "ENGLISH_VOCAB_4600" && sourceManifest.source?.apkgSha256 === EXPECTED.apkgSha256, "SOURCE_APKG_PIN_MISMATCH");
  assert(sourceManifest.assets?.length === 13_977 && bundle.mappings?.length === 14_012, "SOURCE_MANIFEST_COUNTS_MISMATCH");
  assert((sourceManifest.assets as Json[]).filter((asset) => asset.media_kind === "IMAGE").length === 4_669
    && (sourceManifest.assets as Json[]).filter((asset) => asset.media_kind === "AUDIO").length === 9_308, "SOURCE_MEDIA_KIND_COUNTS_MISMATCH");
  assert(backfill.manifestVersion === "vocabflow-v2-cloudinary-complete-source-media-backfill-v1"
    && backfill.source?.apkgSha === EXPECTED.apkgSha256 && backfill.sourcePins?.mappingBundleSha256 === EXPECTED.mappingBundleSha256
    && backfill.sourcePins?.mediaManifestSha256 === EXPECTED.sourceManifestSha256
    && backfill.sourcePins?.sourceRightsLedgerSha256 === EXPECTED.sourceRightsSha256, "BACKFILL_SOURCE_PINS_MISMATCH");
  assert(backfill.target?.project_id === EXPECTED.projectId && backfill.target?.effectivePassDraftCount === EXPECTED.senses
    && backfill.target?.contentFingerprint === EXPECTED.fingerprint, "BACKFILL_TARGET_SNAPSHOT_MISMATCH");
  assert(uploadMap.manifestSha256 === EXPECTED.backfillManifestSha256 && uploadMap.deliveryType === "authenticated"
    && uploadMap.assets?.length === 13_977, "UPLOAD_MAP_BACKFILL_PIN_MISMATCH");
  assert(inventory.records?.length === 4_673, "SOURCE_INVENTORY_COUNT_MISMATCH");
  const noteById = new Map(inventory.records.map((record) => [String(record.sourceRecordId), record]));
  assert(noteById.size === inventory.records.length, "SOURCE_INVENTORY_IDENTITY_COLLISION");
  const assetByHash = new Map<string, Json>();
  for (const asset of backfill.assets ?? []) {
    assert(/^[0-9a-f]{64}$/.test(String(asset.mediaSha256)), "INVALID_SOURCE_ASSET_HASH");
    assert(!assetByHash.has(asset.mediaSha256), "DUPLICATE_SOURCE_ASSET_HASH");
    assetByHash.set(asset.mediaSha256, asset);
  }
  const uploadByHash = new Map<string, Json>();
  for (const asset of uploadMap.assets ?? []) {
    assert(!uploadByHash.has(asset.mediaSha256), "DUPLICATE_UPLOAD_MAP_HASH");
    assert(asset.status === "UPLOADED" && asset.remoteHashVerified === true && asset.deliveryType === "authenticated"
      && String(asset.publicId).startsWith("Vocab/v2/images/") === (asset.mediaKind === "IMAGE"), "CLOUDINARY_ASSET_NOT_VERIFIED");
    uploadByHash.set(asset.mediaSha256, asset);
  }
  assert(assetByHash.size === 13_977 && uploadByHash.size === 13_977, "PINNED_ASSET_COUNTS_MISMATCH");
  for (const [hash, asset] of assetByHash) {
    const uploaded = uploadByHash.get(hash);
    assert(uploaded && uploaded.mimeType === asset.mimeType && Number(uploaded.bytes) === Number(asset.byteLength)
      && (uploaded.verifiedMimeType == null || uploaded.verifiedMimeType === asset.mimeType), "CLOUDINARY_ASSET_PIN_MISMATCH");
  }
  return { sourceManifest, bundle, inventory, backfill, uploadMap, noteById, assetByHash, uploadByHash };
}

function sourceIdentityMatches(candidate: { sourceNoteId: string; sourceNoteGuid: string; sourceRecordEvidenceSha256: string }, record: Json) {
  return String(record.sourceRecordId) === candidate.sourceNoteId && record.sourceNoteGuid === candidate.sourceNoteGuid
    && record.recordEvidenceSha256 === candidate.sourceRecordEvidenceSha256;
}

function validateSourceImage(candidate: Candidate, sources: ReturnType<typeof verifySources>, bundleByKey: Map<string, Json>) {
  const sourceRecord = sources.noteById.get(candidate.sourceNoteId);
  const asset = sources.assetByHash.get(candidate.mediaSha256);
  const upload = sources.uploadByHash.get(candidate.mediaSha256);
  const reference = bundleByKey.get(candidate.mappingKey);
  assert(sourceRecord && sourceIdentityMatches(candidate, sourceRecord), "SOURCE_NOTE_IDENTITY_MISMATCH");
  assert(asset?.mediaKind === "IMAGE" && asset.sourceFileIdentities?.some((file: Json) => file.sourceFilename === candidate.sourceFilename), "SOURCE_IMAGE_FILE_PIN_MISMATCH");
  assert(sourceRecord.sourceFields?.Image && String(sourceRecord.sourceFields.Image).includes(candidate.sourceFilename), "SOURCE_NOTE_IMAGE_FIELD_MISMATCH");
  assert(upload && (asset.mimeType === "image/gif" ? ["image", "raw"].includes(upload.resourceType) : upload.resourceType === "image"), "CLOUDINARY_IMAGE_RESOURCE_TYPE_MISMATCH");
  const expectedStatus = candidate.resolution === "PINNED_SOURCE_PROPOSAL"
    ? "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW" : "SOURCE_CANDIDATE_PENDING_TARGET_SELECTION";
  assert(reference && reference.mediaKind === IMAGE_KIND && reference.mappingStatus === expectedStatus
    && reference.mediaSha256 === candidate.mediaSha256 && reference.sourceFilename === candidate.sourceFilename
    && reference.sourceNoteIdentity?.sourceRecordId === candidate.sourceNoteId
    && reference.sourceNoteIdentity?.sourceNoteGuid === candidate.sourceNoteGuid
    && reference.sourceNoteIdentity?.recordEvidenceSha256 === candidate.sourceRecordEvidenceSha256, "MAPPING_BUNDLE_REFERENCE_MISMATCH");
}

function getDirectCandidates(sources: ReturnType<typeof verifySources>, targetByProposal: Map<string, ProjectionRow>, bundleByKey: Map<string, Json>) {
  const candidates: Candidate[] = [];
  for (const row of sources.backfill.imageMappings as Json[]) {
    const target = targetByProposal.get(String(row.targetProposalKey));
    const sourceNoteId = String(row.sourceNoteId);
    const sourceNoteGuid = String(row.sourceNoteGuid);
    const sourceRecordEvidenceSha256 = String(row.sourceRecordEvidenceSha256);
    const sourceRecord = sources.noteById.get(sourceNoteId);
    assert(target && sourceRecord && sourceIdentityMatches({ sourceNoteId, sourceNoteGuid, sourceRecordEvidenceSha256 }, sourceRecord), "DIRECT_TARGET_OR_SOURCE_MISSING");
    assert(target.vocabulary_id === Number(row.targetVocabularyId) && target.content_sha256 === row.targetContentSha256
      && normalize(target.word) === normalize(row.sourceLemma) && normalizePos(target.part_of_speech) === normalizePos(row.targetPartOfSpeech), "DIRECT_TARGET_IDENTITY_HASH_MISMATCH");
    assert((row.sourcePos as string[]).map(normalizePos).includes(normalizePos(target.part_of_speech)), "DIRECT_SOURCE_POS_MISMATCH");
    assert(hasExactSourceProvenance(target.source_provenance, sourceNoteId, sourceNoteGuid, sourceRecordEvidenceSha256), "DIRECT_SOURCE_NOT_IN_TARGET_PROVENANCE");
    const semantic = row.semanticEvidence;
    assert(semantic?.winnerProposalKey === row.targetProposalKey && Number(semantic.winnerScore) >= 0.22
      && (Number(semantic.winnerScore) - Number(semantic.runnerUpScore ?? 0)) >= 0.15
      && semantic.visualReview === "NOT_PERFORMED", "DIRECT_SEMANTIC_EVIDENCE_INVALID");
    const candidate: Candidate = {
      mappingKey: String(row.mappingKey), mediaSha256: String(row.mediaSha256), sourceFilename: String(row.sourceFilename),
      sourceNoteId, sourceNoteGuid, sourceRecordEvidenceSha256, sourceLemma: String(row.sourceLemma),
      sourcePos: (row.sourcePos as unknown[]).map(normalizePos), targetProposalKey: target.proposal_key,
      targetContentSha256: target.content_sha256, targetVocabularyId: Number(target.vocabulary_id),
      targetPartOfSpeech: normalizePos(target.part_of_speech), mappingConfidence: Number(row.mappingConfidence),
      evidence: { mode: "PINNED_SOURCE_PROPOSAL", mappingKey: row.mappingKey, method: semantic.method, score: semantic.winnerScore,
        runnerUpScore: semantic.runnerUpScore, mappingBundleSha256: EXPECTED.mappingBundleSha256,
        targetContentSha256: target.content_sha256, visualReview: "NOT_PERFORMED" }, resolution: "PINNED_SOURCE_PROPOSAL"
    };
    validateSourceImage(candidate, sources, bundleByKey);
    candidates.push(candidate);
  }
  assert(candidates.length === 2_981, "DIRECT_IMAGE_PROPOSAL_COUNT_MISMATCH");
  return candidates;
}

function getPendingCandidates(sources: ReturnType<typeof verifySources>, targets: ProjectionRow[], bundleByKey: Map<string, Json>) {
  const targetByLemmaPos = new Map<string, ProjectionRow[]>();
  for (const target of targets) {
    const key = `${normalize(target.word)}|${normalizePos(target.part_of_speech)}`;
    targetByLemmaPos.set(key, [...(targetByLemmaPos.get(key) ?? []), target]);
  }
  const pendingRefs = (sources.bundle.mappings as Json[]).filter((mapping) => mapping.mediaKind === IMAGE_KIND
    && mapping.mappingStatus === "SOURCE_CANDIDATE_PENDING_TARGET_SELECTION");
  const candidates: Candidate[] = [];
  const counts = { examined: 0, missingDefinition: 0, noEligibleWinner: 0, belowThreshold: 0, ambiguous: 0, provenanceNotPinnedToTarget: 0 };
  for (const reference of pendingRefs) {
    counts.examined += 1;
    const identity = reference.sourceNoteIdentity;
    const sourceNoteId = String(identity?.sourceRecordId ?? "");
    const sourceNoteGuid = String(identity?.sourceNoteGuid ?? "");
    const sourceRecordEvidenceSha256 = String(identity?.recordEvidenceSha256 ?? "");
    const record = sources.noteById.get(sourceNoteId);
    assert(record && record.sourceNoteGuid === sourceNoteGuid && record.recordEvidenceSha256 === sourceRecordEvidenceSha256, "PENDING_SOURCE_NOTE_PIN_MISMATCH");
    const asset = sources.assetByHash.get(String(reference.mediaSha256));
    const upload = sources.uploadByHash.get(String(reference.mediaSha256));
    assert(asset?.mediaKind === "IMAGE" && asset.sourceFileIdentities?.some((file: Json) => file.sourceFilename === reference.sourceFilename)
      && String(record.sourceFields?.Image ?? "").includes(String(reference.sourceFilename)), "PENDING_SOURCE_IMAGE_FILE_MISMATCH");
    assert(upload?.mediaKind === "IMAGE" && upload.remoteHashVerified === true, "PENDING_IMAGE_NOT_REMOTE_VERIFIED");
    const definition = sourceDefinition(record);
    if (!definition.trim()) { counts.missingDefinition += 1; continue; }
    const lemma = normalize(record.normalizedHeadword ?? record.headwordText);
    const sourcePos = ((reference.mappingEvidence?.sourcePosClasses ?? record.sourcePosClassesCandidate ?? []) as unknown[]).map(normalizePos);
    const targetsForSource = [...new Set(sourcePos.flatMap((pos) => targetByLemmaPos.get(`${lemma}|${pos}`) ?? []))];
    if (targetsForSource.length === 0) { counts.noEligibleWinner += 1; continue; }
    const scores = targetsForSource.map((target) => ({ target, score: semanticDice(definition, target.definition_en, lemma) }))
      .sort((left, right) => right.score - left.score || left.target.proposal_key.localeCompare(right.target.proposal_key));
    const winner = scores[0]!;
    const runnerUpScore = scores[1]?.score ?? 0;
    const pendingKeys = new Set((reference.mappingEvidence?.candidateProposalKeysPendingSelection ?? []) as string[]);
    if (!pendingKeys.has(winner.target.proposal_key) || winner.score < 0.22 || (scores.length > 1 && winner.score - runnerUpScore < 0.15)) {
      if (winner.score < 0.22) counts.belowThreshold += 1;
      else counts.ambiguous += 1;
      continue;
    }
    const target = winner.target;
    assert(normalize(target.word) === lemma && sourcePos.includes(normalizePos(target.part_of_speech)), "PENDING_TARGET_LEMMA_POS_MISMATCH");
    if (!hasExactSourceProvenance(target.source_provenance, sourceNoteId, sourceNoteGuid, sourceRecordEvidenceSha256)) {
      counts.provenanceNotPinnedToTarget += 1;
      continue;
    }
    const candidate: Candidate = {
      mappingKey: String(reference.mappingKey), mediaSha256: String(reference.mediaSha256), sourceFilename: String(reference.sourceFilename),
      sourceNoteId, sourceNoteGuid, sourceRecordEvidenceSha256, sourceLemma: lemma, sourcePos,
      targetProposalKey: target.proposal_key, targetContentSha256: target.content_sha256, targetVocabularyId: Number(target.vocabulary_id),
      targetPartOfSpeech: normalizePos(target.part_of_speech), mappingConfidence: Math.min(0.99, 0.55 + winner.score * 0.4),
      evidence: { mode: "CONSERVATIVE_PENDING_CANDIDATE", mappingKey: reference.mappingKey,
        method: "SOURCE_NOTE_ENGLISH_DEFINITION_VS_CURRENT_V2_DEFINITION_TOKEN_DICE",
        sourceMeaningSha256: sha256(Buffer.from(cleanEnglish(definition))), winnerScore: winner.score, runnerUpScore,
        minimumScore: 0.22, minimumMargin: 0.15, winnerMustBePinnedCandidate: true,
        mappingBundleSha256: EXPECTED.mappingBundleSha256, targetContentSha256: target.content_sha256,
        visualReview: "NOT_PERFORMED" }, resolution: "CONSERVATIVE_PENDING_CANDIDATE"
    };
    validateSourceImage(candidate, sources, bundleByKey);
    candidates.push(candidate);
  }
  return { candidates, counts, sourcePendingRows: pendingRefs.length };
}

function isExactTargetItem(item: Json, target: ProjectionRow) {
  return item?.targetProposalKey === target.proposal_key && item?.targetContentSha256 === target.content_sha256;
}

function sourceIdentityKey(item: Json) {
  return `${String(item?.sourceNoteIdentity ?? "")}|${String(item?.mediaSha256 ?? "")}`;
}

export function mergeCurrentImages(target: ProjectionRow, additions: Json[]) {
  const current = Array.isArray(target.development_media?.images) ? target.development_media.images as Json[] : [];
  const exact = current.filter((item) => isExactTargetItem(item, target));
  if (exact.some((item) => item.reviewStatus !== "PROPOSED" && item.reviewStatus !== "ACCEPTED_MAPPING"
    || item.rightsStatus !== "UNKNOWN_REVIEW_REQUIRED")) return { images: current, blocked: "EXACT_CURRENT_MAPPING_HAS_OTHER_REVIEW_OR_RIGHTS_STATUS", changed: false };
  const exactHashes = new Set(exact.map((item) => String(item.mediaSha256)));
  const allHashes = new Set([...exactHashes, ...additions.map((item) => String(item.mediaSha256))]);
  if (allHashes.size > 1) return { images: current, blocked: "MULTIPLE_DISTINCT_CURRENT_IMAGE_HASHES", changed: false };

  const next = current.map((item) => ({ ...item }));
  let changed = false;
  for (const addition of additions) {
    let matchingIndex = next.findIndex((item) => item.mappingKey === addition.mappingKey
      && item.mediaSha256 === addition.mediaSha256);
    if (matchingIndex < 0) matchingIndex = next.findIndex((item) => !item.mappingKey
      && sourceIdentityKey(item) === sourceIdentityKey(addition));
    if (matchingIndex >= 0) {
      const previous = next[matchingIndex]!;
      const pinsExist = previous.targetProposalKey != null || previous.targetContentSha256 != null;
      if (pinsExist && !isExactTargetItem(previous, target)) return { images: current, blocked: "SOURCE_REFERENCE_ALREADY_PINNED_ELSEWHERE", changed: false };
      if (previous.reviewStatus !== "PROPOSED" || previous.rightsStatus !== "UNKNOWN_REVIEW_REQUIRED") {
        if (isExactTargetItem(previous, target)) return { images: current, blocked: "MATCHING_ITEM_HAS_NON_PROPOSAL_STATUS", changed: false };
        continue;
      }
      if (stable(previous) !== stable(addition)) {
        next[matchingIndex] = addition;
        changed = true;
      }
    } else {
      next.push(addition);
      changed = true;
    }
  }
  return { images: next, blocked: null, changed };
}

function makeCloudinaryUrl(asset: Json, upload: Json) {
  const format = String(asset.extension).toLocaleLowerCase("und");
  const allowedExts = IMAGE_MIME_EXT.get(String(asset.mimeType));
  assert(allowedExts?.has(format), "IMAGE_MIME_EXTENSION_MISMATCH");
  const resourceType = String(upload.resourceType);
  assert((format === "gif" && ["image", "raw"].includes(resourceType)) || (format !== "gif" && resourceType === "image"), "IMAGE_RESOURCE_TYPE_INVALID");
  const url = cloudinary.url(upload.publicId, {
    secure: true, sign_url: true, resource_type: resourceType, type: "authenticated",
    version: Number(upload.version), format, use_filename: false, unique_filename: false,
  });
  const parsed = new URL(url);
  assert(parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com", "SIGNED_IMAGE_URL_HOST_INVALID");
  const parts = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
  assert(parts[1] === resourceType && parts[2] === "authenticated" && parts[3]?.startsWith("s--")
    && parts.slice(-3, -1).join("/") === "v2/images" && parts.at(-1)?.split(".")[0] === asset.mediaSha256, "SIGNED_IMAGE_URL_NAMESPACE_INVALID");
  return url;
}

function buildItems(candidates: Candidate[], sources: ReturnType<typeof verifySources>, targets: ProjectionRow[]) {
  const targetByProposal = new Map(targets.map((target) => [target.proposal_key, target]));
  const byTarget = new Map<string, Candidate[]>();
  for (const candidate of candidates) byTarget.set(candidate.targetProposalKey, [...(byTarget.get(candidate.targetProposalKey) ?? []), candidate]);
  const additions = new Map<string, Json[]>();
  const blockedTargets: { targetProposalKey: string; reason: string }[] = [];
  for (const [proposalKey, proposed] of byTarget) {
    const target = targetByProposal.get(proposalKey)!;
    const existing = (Array.isArray(target.development_media?.images) ? target.development_media.images : []) as Json[];
    const exactHashes = new Set(existing.filter((item) => isExactTargetItem(item, target)).map((item) => String(item.mediaSha256)));
    const hashes = new Set([...exactHashes, ...proposed.map((candidate) => candidate.mediaSha256)]);
    if (hashes.size > 1) {
      blockedTargets.push({ targetProposalKey: proposalKey, reason: "MULTIPLE_DISTINCT_CURRENT_IMAGE_HASHES" });
      continue;
    }
    const items: Json[] = [];
    for (const candidate of proposed) {
      const asset = sources.assetByHash.get(candidate.mediaSha256)!;
      const upload = sources.uploadByHash.get(candidate.mediaSha256)!;
      const evidence = { ...candidate.evidence, sourceNoteId: candidate.sourceNoteId, sourceNoteGuid: candidate.sourceNoteGuid,
        sourceRecordEvidenceSha256: candidate.sourceRecordEvidenceSha256, sourceFilename: candidate.sourceFilename,
        sourceLemma: candidate.sourceLemma, sourcePos: candidate.sourcePos, sourceSha256: candidate.mediaSha256,
        targetProposalKey: candidate.targetProposalKey, targetVocabularyId: candidate.targetVocabularyId,
        targetContentSha256: candidate.targetContentSha256, resolution: candidate.resolution };
      items.push({ mappingKey: candidate.mappingKey, sourceNoteIdentity: `${candidate.sourceNoteId}:${candidate.sourceNoteGuid}`,
        sourceNoteId: candidate.sourceNoteId, sourceNoteGuid: candidate.sourceNoteGuid,
        sourceRecordEvidenceSha256: candidate.sourceRecordEvidenceSha256, sourceFilename: candidate.sourceFilename,
        mediaSha256: candidate.mediaSha256, mimeType: asset.mimeType, byteLength: asset.byteLength,
        url: makeCloudinaryUrl(asset, upload), targetProposalKey: target.proposal_key,
        targetContentSha256: target.content_sha256, reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
        mappingConfidence: candidate.mappingConfidence, mappingEvidence: stable(evidence), visualReview: "NOT_PERFORMED",
        provider: "CLOUDINARY", publicId: upload.publicId, resourceType: upload.resourceType,
        deliveryType: "authenticated", sourceApkgSha256: EXPECTED.apkgSha256,
        sourceMappingBundleSha256: EXPECTED.mappingBundleSha256 });
    }
    const merged = mergeCurrentImages(target, items);
    if (merged.blocked) blockedTargets.push({ targetProposalKey: proposalKey, reason: merged.blocked });
    else if (merged.changed) additions.set(proposalKey, merged.images);
  }
  return { additions, blockedTargets };
}

function coverage(rows: ProjectionRow[]) {
  let totalImageEntries = 0;
  let sensesWithAnyImageEntry = 0;
  let sensesWithPinnedImage = 0;
  let proposedPinnedRows = 0;
  let distinctHashes = 0;
  const hashes = new Set<string>();
  for (const row of rows) {
    const images = Array.isArray(row.development_media?.images) ? row.development_media.images as Json[] : [];
    totalImageEntries += images.length;
    if (images.length > 0) sensesWithAnyImageEntry += 1;
    const current = images.filter((item) => isExactTargetItem(item, row));
    if (new Set(current.map((item) => String(item.mediaSha256))).size === 1 && current.length > 0) sensesWithPinnedImage += 1;
    proposedPinnedRows += current.filter((item) => item.reviewStatus === "PROPOSED" && item.rightsStatus === "UNKNOWN_REVIEW_REQUIRED").length;
    current.forEach((item) => hashes.add(String(item.mediaSha256)));
  }
  distinctHashes = hashes.size;
  return { sensesWithAnyImageEntry, totalImageEntries, sensesWithPinnedImage, proposedPinnedRows, uniqueImageHashes: distinctHashes };
}

function classifyCoverage(rows: ProjectionRow[], bundle: Json) {
  const mapped = new Set<string>();
  const sourceCandidateTargets = new Set<string>();
  const imageMappings = (bundle.mappings as Json[]).filter((mapping) => mapping.mediaKind === IMAGE_KIND);
  for (const row of rows) {
    const exact = (Array.isArray(row.development_media?.images) ? row.development_media.images : [])
      .filter((item: Json) => isExactTargetItem(item, row));
    if (exact.length > 0 && new Set(exact.map((item: Json) => String(item.mediaSha256))).size === 1
      && exact.every((item: Json) => item.reviewStatus === "PROPOSED" && item.rightsStatus === "UNKNOWN_REVIEW_REQUIRED")) {
      mapped.add(row.proposal_key);
    }
  }
  for (const mapping of imageMappings) {
    const evidence = mapping.mappingEvidence ?? {};
    const keys = [mapping.targetSenseProposalKey, mapping.targetProposalKey,
      ...(Array.isArray(evidence.effectiveSourceEvidenceProposalKeys) ? evidence.effectiveSourceEvidenceProposalKeys : []),
      ...(Array.isArray(evidence.candidateProposalKeysPendingSelection) ? evidence.candidateProposalKeysPendingSelection : [])]
      .filter((key): key is string => typeof key === "string");
    keys.forEach((key) => sourceCandidateTargets.add(key));
  }
  const currentKeys = new Set(rows.map((row) => row.proposal_key));
  const unresolvedWithCandidates = [...sourceCandidateTargets].filter((key) => currentKeys.has(key) && !mapped.has(key));
  return { mappedSenseIdentities: mapped.size, unresolvedSenseIdentitiesWithSourceCandidates: unresolvedWithCandidates.length,
    noSuitableSourceImageCandidate: rows.length - mapped.size - unresolvedWithCandidates.length };
}

function sampleSenseReport(rows: ProjectionRow[], candidates: Candidate[], sources: ReturnType<typeof verifySources>) {
  const byId = new Map(rows.map((row) => [Number(row.vocabulary_id), row]));
  const wanted = [29357, 29385, 29355, 29356, 29283, 30830];
  return wanted.map((id) => {
    const row = byId.get(id);
    if (!row) return { vocabularyId: id, found: false };
    const images = Array.isArray(row.development_media?.images) ? row.development_media.images as Json[] : [];
    const exact = images.filter((item) => isExactTargetItem(item, row));
    const sourceRefs = (sources.bundle.mappings as Json[]).filter((mapping) => mapping.mediaKind === IMAGE_KIND
      && normalize(mapping.mappingEvidence?.sourceLemma) === normalize(row.word));
    const sourceStatusCounts = Object.fromEntries(sourceRefs.reduce<Map<string, number>>((counts, mapping) => {
      const key = String(mapping.mappingStatus);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()));
    const sourceDiagnostics = sourceRefs.map((mapping) => {
      const noteId = String(mapping.sourceNoteIdentity?.sourceRecordId ?? "");
      const record = sources.noteById.get(noteId);
      const sourcePos = ((mapping.mappingEvidence?.sourcePosClasses ?? []) as unknown[]).map(normalizePos);
      const definition = record ? sourceDefinition(record) : "";
      const targetScores = rows.filter((target) => normalize(target.word) === normalize(row.word)
        && sourcePos.includes(normalizePos(target.part_of_speech)))
        .map((target) => ({ proposalKey: target.proposal_key, score: semanticDice(definition, target.definition_en, normalize(row.word)) }))
        .sort((left, right) => right.score - left.score || left.proposalKey.localeCompare(right.proposalKey));
      const winner = targetScores[0];
      const runnerUp = targetScores[1];
      const candidateKeys = (mapping.mappingEvidence?.candidateProposalKeysPendingSelection ?? []) as string[];
      const reason = sourcePos.length === 0 || !rows.some((target) => normalize(target.word) === normalize(row.word)
        && sourcePos.includes(normalizePos(target.part_of_speech))) ? "SOURCE_POS_HAS_NO_CURRENT_TARGET"
        : !winner || winner.score < 0.22 ? "BELOW_MINIMUM_SEMANTIC_SCORE"
        : targetScores.length > 1 && winner.score - (runnerUp?.score ?? 0) < 0.15 ? "SEMANTIC_WINNER_MARGIN_AMBIGUOUS"
        : !candidateKeys.includes(winner.proposalKey) ? "WINNER_NOT_IN_PINNED_CANDIDATES"
        : !record || !hasExactSourceProvenance(row.source_provenance, noteId, String(mapping.sourceNoteIdentity?.sourceNoteGuid ?? ""), String(mapping.sourceNoteIdentity?.recordEvidenceSha256 ?? ""))
          ? "SOURCE_NOTE_NOT_PINNED_TO_TARGET_PROVENANCE" : "ELIGIBLE";
      return { mappingStatus: mapping.mappingStatus, sourceNoteId: noteId, sourcePos, targetScores, pinnedCandidateKeys: candidateKeys, resolution: reason };
    });
    return { vocabularyId: id, proposalKey: row.proposal_key, word: row.word, partOfSpeech: normalizePos(row.part_of_speech),
      totalImageEntries: images.length, exactCurrentTargetHashRows: exact.length,
      exactCurrentHashes: [...new Set(exact.map((item) => String(item.mediaSha256).slice(0, 12)))],
      sourceImageStatusCounts: sourceStatusCounts,
      proposedBackfillRows: candidates.filter((candidate) => candidate.targetProposalKey === row.proposal_key).length,
      sourceDiagnostics };
  });
}

async function queryTargets(sql: Sql<Record<string, never>>): Promise<ProjectionRow[]> {
  return await sql<ProjectionRow[]>`
    select p.proposal_key, p.vocabulary_id, p.part_of_speech, p.content_sha256,
      p.content_review_decision, p.editorial_status, p.rights_status, p.source_provenance,
      p.development_media, v.word, v.definition_en, v.enabled
    from vocabflow_app.master_v2_development_projections p
    join vocabflow_app.vocabularies v on v.id = p.vocabulary_id
    where p.content_review_decision = 'PASS' and p.editorial_status = 'DRAFT' and v.enabled = true
    order by p.proposal_key
  `;
}

async function assertTargetSnapshot(sql: Sql<Record<string, never>>) {
  await assertPostConnectIdentity(sql as never, DATABASE_TARGETS.production);
  const rows = await queryTargets(sql);
  assert(rows.length === EXPECTED.senses && new Set(rows.map((row) => row.proposal_key)).size === EXPECTED.senses
    && new Set(rows.map((row) => row.vocabulary_id)).size === EXPECTED.senses, "PRODUCTION_V2_SENSE_COUNT_OR_IDENTITY_MISMATCH");
  assert(rows.every((row) => row.enabled && row.content_review_decision === "PASS" && row.editorial_status === "DRAFT"
    && row.rights_status === "UNKNOWN_REVIEW_REQUIRED" && /^[0-9a-f]{64}$/.test(row.content_sha256)), "PRODUCTION_V2_SENSE_STATUS_MISMATCH");
  assert(stableFingerprint(rows) === EXPECTED.fingerprint, "PRODUCTION_V2_CONTENT_FINGERPRINT_MISMATCH");
  return rows;
}

async function verifyCloudinaryDelivery(items: Map<string, Json[]>, sources: ReturnType<typeof verifySources>) {
  const candidates = [...items.values()].flat().filter((item) => typeof item.url === "string");
  const selected: Json[] = [];
  const wanted = ["advertise", "banana", "abolish", "age"];
  for (const word of wanted) {
    const match = candidates.find((item) => String(item.mappingEvidence).includes(`\"sourceLemma\":\"${word}\"`));
    if (match) selected.push(match);
  }
  const gif = candidates.find((item) => item.mimeType === "image/gif");
  if (gif) selected.push(gif);
  await Promise.all([...new Map(selected.map((entry) => [entry.mediaSha256, entry])).values()].map(async (item) => {
    try {
      const response = await fetch(String(item.url), { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15_000) });
      const mime = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
      if (!response.ok || mime !== String(item.mimeType).toLowerCase()) throw new Error("CLOUDINARY_HEAD_OR_MIME_FAILED");
    } catch {
      throw new Error("CLOUDINARY_SIGNED_IMAGE_PREFLIGHT_FAILED");
    }
  }));
  return { checked: new Set(selected.map((entry) => entry.mediaSha256)).size, sourceAssetsVerified: sources.uploadByHash.size };
}

async function readPreservationCounts(sql: Sql<Record<string, never>>) {
  const [row] = await sql<[{ vocabularies: number; learnerProgress: number; reviewEvents: number; topics: number; learningSets: number; setItems: number; vocabularyTopics: number }]>`
    select (select count(*)::int from vocabflow_app.vocabularies) as vocabularies,
      (select count(*)::int from vocabflow_app.learner_progress) as "learnerProgress",
      (select count(*)::int from vocabflow_app.review_events) as "reviewEvents",
      (select count(*)::int from vocabflow_app.topics) as topics,
      (select count(*)::int from vocabflow_app.learning_sets) as "learningSets",
      (select count(*)::int from vocabflow_app.learning_set_items) as "setItems",
      (select count(*)::int from vocabflow_app.vocabulary_topics) as "vocabularyTopics"
  `;
  return row;
}

async function applyPlan(sql: Sql<Record<string, never>>, rowsBefore: ProjectionRow[], updates: Map<string, Json[]>) {
  return await sql.begin(async (tx) => {
    await tx`set transaction isolation level serializable`;
    await assertPostConnectIdentity(tx as never, DATABASE_TARGETS.production);
    const beforeRows = await queryTargets(tx as unknown as Sql<Record<string, never>>);
    assert(stableFingerprint(beforeRows) === EXPECTED.fingerprint, "PRODUCTION_CONTENT_CHANGED_BEFORE_WRITE");
    const beforePreservation = await readPreservationCounts(tx as unknown as Sql<Record<string, never>>);
    const beforeByKey = new Map(beforeRows.map((row) => [row.proposal_key, row]));
    const payload = [...updates].map(([proposal_key, images]) => ({ proposal_key,
      expected_hash: beforeByKey.get(proposal_key)!.content_sha256,
      expected_media: beforeByKey.get(proposal_key)!.development_media ?? {},
      images }));
    let changed = 0;
    for (let offset = 0; offset < payload.length; offset += 250) {
      const chunk = payload.slice(offset, offset + 250);
      const result = await tx.unsafe(`update vocabflow_app.master_v2_development_projections p
        set development_media = jsonb_set(coalesce(p.development_media, '{}'::jsonb), '{images}', x.images, true)
        from jsonb_to_recordset($1::text::jsonb) as x(proposal_key text, expected_hash text, expected_media jsonb, images jsonb)
        where p.proposal_key = x.proposal_key and p.content_sha256 = x.expected_hash
          and p.development_media is not distinct from x.expected_media
        returning p.proposal_key`, [JSON.stringify(chunk)]);
      changed += result.length;
      assert(result.length === chunk.length, "PRODUCTION_IMAGE_BACKFILL_COMPARE_AND_SET_FAILED");
    }
    const afterRows = await queryTargets(tx as unknown as Sql<Record<string, never>>);
    assert(stableFingerprint(afterRows) === EXPECTED.fingerprint && afterRows.length === rowsBefore.length, "PRODUCTION_CONTENT_CHANGED_DURING_BACKFILL");
    assert(afterRows.every((row) => row.content_review_decision === "PASS" && row.editorial_status === "DRAFT"
      && row.rights_status === "UNKNOWN_REVIEW_REQUIRED"), "PRODUCTION_CANONICAL_STATUS_CHANGED");
    const afterPreservation = await readPreservationCounts(tx as unknown as Sql<Record<string, never>>);
    assert(stable(beforePreservation) === stable(afterPreservation), "PRODUCTION_LEARNER_OR_TAXONOMY_COUNTS_CHANGED");
    for (const [proposalKey, images] of updates) {
      const actual = afterRows.find((row) => row.proposal_key === proposalKey);
      assert(actual && stable(actual.development_media?.images ?? []) === stable(images), "PRODUCTION_IMAGE_MAPPING_READBACK_MISMATCH");
      assert(images.every((item) => item.reviewStatus === "PROPOSED" && item.rightsStatus === "UNKNOWN_REVIEW_REQUIRED"
        && item.targetProposalKey === proposalKey && item.targetContentSha256 === actual.content_sha256), "PRODUCTION_IMAGE_MAPPING_GATE_MISMATCH");
    }
    return { changedRows: changed, beforeCoverage: coverage(rowsBefore), afterCoverage: coverage(afterRows),
      targetFingerprint: stableFingerprint(afterRows), preservationCounts: afterPreservation };
  });
}

function writeAudit(report: Json) {
  const path = resolve(MEDIA_DIR, "production-image-coverage-backfill-v1.json");
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  renameSync(temp, path);
  return path;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const releaseArgs = args.filter((argument) => argument !== "--apply");
  const options = parseProductionReleaseArgs(releaseArgs);
  process.env.VOCABFLOW_ENV = "production";
  process.env.DATABASE_ENV = "production";
  process.env.EXECUTION_CONTEXT = "local-development";
  const target = authorizeProductionRelease({ options, mode: apply ? "mutation" : "read-only", environment: process.env });
  assert(target.projectId === EXPECTED.projectId && target.branchId === EXPECTED.branchId && target.databaseName === EXPECTED.databaseName, "PRODUCTION_TARGET_CONSTANT_MISMATCH");
  if (!process.env.NEON_API_KEY) throw new Error("NEON_API_KEY_REQUIRED");
  if (!process.env.PRODUCTION_MIGRATION_DATABASE_URL) {
    const uri = await createNeonApiClient(process.env.NEON_API_KEY).getConnectionUri({ projectId: target.projectId,
      branchId: target.branchId, databaseName: target.databaseName, roleName: target.roleName, pooled: true });
    process.env.PRODUCTION_MIGRATION_DATABASE_URL = uri.uri;
  }
  const connection = await resolveProductionConnection({ purpose: "migration", environment: process.env });
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "CLOUDINARY_CONFIG_REQUIRED");
  const sources = verifySources();
  const sql = openSql(connection.url);
  try {
    const rows = await assertTargetSnapshot(sql);
    const targetByProposal = new Map(rows.map((row) => [row.proposal_key, row]));
    const bundleByKey = new Map((sources.bundle.mappings as Json[]).map((mapping) => [String(mapping.mappingKey), mapping]));
    const direct = getDirectCandidates(sources, targetByProposal, bundleByKey);
    const pending = getPendingCandidates(sources, rows, bundleByKey);
    const proposals = [...direct, ...pending.candidates];
    const { additions, blockedTargets } = buildItems(proposals, sources, rows);
    const cloudinaryPreflight = await verifyCloudinaryDelivery(additions, sources);
    const beforeCoverage = coverage(rows);
    const prospectiveRows = rows.map((row) => {
      const images = additions.get(row.proposal_key);
      return images ? { ...row, development_media: { ...(row.development_media ?? {}), images } } : row;
    });
    const plan = { schemaVersion: 1, status: apply ? "APPLY_REQUESTED" : "DRY_RUN", target: {
        projectId: target.projectId, branchId: target.branchId, databaseName: EXPECTED.databaseName,
        contentFingerprint: stableFingerprint(rows), senseCount: rows.length },
      sourcePins: { mappingBundleSha256: EXPECTED.mappingBundleSha256, sourceManifestSha256: EXPECTED.sourceManifestSha256,
        backfillManifestSha256: EXPECTED.backfillManifestSha256, uploadMapSha256: EXPECTED.uploadMapSha256,
        sourceInventorySha256: EXPECTED.inventorySha256 },
      candidates: { pinnedProposals: direct.length, conservativePendingResolved: pending.candidates.length,
        pendingResolution: pending.counts, proposedRows: proposals.length,
        proposalTargetSenses: new Set(proposals.map((row) => row.targetProposalKey)).size,
        updateTargetSenses: additions.size, updateMappingRows: [...additions.values()].reduce((n, values) => n + values.length, 0),
        updateTargetProposalKeys: [...additions.keys()].sort(),
        blockedTargets: blockedTargets.length, blockedTargetReasons: Object.fromEntries(blockedTargets.reduce((counts, item) => counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1), new Map<string, number>())) },
      coverageBefore: beforeCoverage, coverageAfterPlan: coverage(prospectiveRows),
      senseClassificationAfterPlan: classifyCoverage(prospectiveRows, sources.bundle),
      requiredSenseSamples: sampleSenseReport(prospectiveRows, proposals, sources),
      cloudinaryPreflight, rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
      reviewStatus: "PROPOSED", ambiguousTargetsRemainUnresolved: true, visualReview: "NOT_PERFORMED", generatedAt: new Date().toISOString() };
    if (!apply) {
      const auditPath = writeAudit(plan);
      console.log(JSON.stringify({ ...plan, auditArtifact: auditPath.replace(ROOT, "").replaceAll("\\", "/") }, null, 2));
      return;
    }
    const result = await applyPlan(sql, rows, additions);
    const report = { ...plan, status: "APPLIED", ...result, recordedAt: new Date().toISOString() };
    const auditPath = writeAudit(report);
    console.log(JSON.stringify({ ...report, auditArtifact: auditPath.replace(ROOT, "").replaceAll("\\", "/") }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
    delete process.env.PRODUCTION_MIGRATION_DATABASE_URL;
  }
}

const invoked = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invoked) {
  main().catch((error: unknown) => {
    const code = error instanceof Error ? error.message : "PRODUCTION_IMAGE_BACKFILL_FAILED";
    console.error(/^[A-Z][A-Z0-9_]{2,120}$/.test(code) ? code : "PRODUCTION_IMAGE_BACKFILL_FAILED");
    process.exitCode = 1;
  });
}
