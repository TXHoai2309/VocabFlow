import type { RuntimeBindings } from "./runtime-bindings";
import { ownerPublishedPublicMedia } from "./owner-public-media";

/**
 * The exact ID must be explicitly configured for each Vercel environment.
 */
export const V2_PUBLIC_MEDIA_OWNER_ATTESTATION_ID = "vocabflow-v2-public-media-owner-2026-10-18";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CLOUDINARY_SIGNATURE_PATTERN = /^s--[A-Za-z0-9_-]{8}--$/;
const ALLOWED_MAPPING_STATUSES = new Set(["ACCEPTED_MAPPING", "PROPOSED"]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isDeploymentEnvironment(env: RuntimeBindings) {
  return env.VERCEL_ENV !== undefined
    || env.VOCABFLOW_ENV === "production"
    || env.DATABASE_ENV === "production";
}

export function hasV2PublicMediaOwnerAuthorization(env: RuntimeBindings) {
  return env.VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID === V2_PUBLIC_MEDIA_OWNER_ATTESTATION_ID;
}

/** Preserve the default-deny signal for callers and tests. */
export function mustWithholdV2Media(env: RuntimeBindings) {
  return isDeploymentEnvironment(env) && !hasV2PublicMediaOwnerAuthorization(env);
}

/** Deployed responses are always sanitized, even after authorization, to keep internal mapping data private. */
export function mustSanitizeV2MediaResponse(env: RuntimeBindings) {
  return isDeploymentEnvironment(env);
}

function validSignedCloudinaryUrl(rawUrl: unknown, kind: "image" | "audio", mimeType: unknown): rawUrl is string {
  if (!nonEmptyString(rawUrl) || typeof mimeType !== "string") return false;

  let url: URL;
  let pathSegments: string[];
  try {
    url = new URL(rawUrl);
    pathSegments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.username || url.password
    || url.port || url.hash || pathSegments.some((segment) => segment === "." || segment === "..")) return false;

  const cloudName = pathSegments[0];
  const resourceType = pathSegments[1];
  const deliveryType = pathSegments[2];
  if (!cloudName || !/^[a-z0-9-]+$/i.test(cloudName) || deliveryType !== "authenticated") return false;

  const acceptedPathSignature = CLOUDINARY_SIGNATURE_PATTERN.test(pathSegments[3] ?? "");
  const token = url.searchParams.get("__cld_token__");
  const queryKeys = [...url.searchParams.keys()];
  const acceptedToken = Boolean(token
    && queryKeys.length === 1
    && queryKeys[0] === "__cld_token__"
    && token.split("~").some((part) => /^hmac=[a-f0-9]{64}$/i.test(part))
    && token.split("~").some((part) => /^(exp|dur)=\d+$/i.test(part)));
  // Cloudinary SDKs append `_a` as an analytics query parameter by default.
  // It does not replace or alter the signed authenticated delivery path.
  const acceptedSdkAnalytics = queryKeys.length === 1
    && queryKeys[0] === "_a"
    && /^[A-Za-z0-9._~-]{1,256}$/.test(url.searchParams.get("_a") ?? "");
  if (!acceptedPathSignature && !acceptedToken) return false;
  if (acceptedPathSignature && queryKeys.length > 0 && !acceptedSdkAnalytics) return false;

  let publicIdSegments = pathSegments.slice(acceptedPathSignature ? 4 : 3);
  if (publicIdSegments[0] && /^v\d+$/.test(publicIdSegments[0])) publicIdSegments = publicIdSegments.slice(1);
  if (publicIdSegments.length < 4) return false;

  const expectedNamespace = kind === "image" ? "images" : "audio";
  if (publicIdSegments[0] !== "Vocab" || publicIdSegments[1] !== "v2" || publicIdSegments[2] !== expectedNamespace) return false;
  const extension = publicIdSegments.at(-1)?.split(".").at(-1)?.toLocaleLowerCase();

  if (kind === "audio") return resourceType === "video" && mimeType === "audio/mpeg" && extension === "mp3";
  if (mimeType === "image/jpeg") return resourceType === "image" && (extension === "jpg" || extension === "jpeg");
  if (mimeType === "image/png") return resourceType === "image" && extension === "png";
  if (mimeType === "image/webp") return resourceType === "image" && extension === "webp";
  if (mimeType === "image/gif") return (resourceType === "raw" || resourceType === "image") && extension === "gif";
  return false;
}

function validMappingItem(value: unknown): value is JsonRecord {
  if (!isRecord(value)) return false;
  return nonEmptyString(value.sourceNoteIdentity)
    && typeof value.mediaSha256 === "string"
    && SHA256_PATTERN.test(value.mediaSha256)
    && typeof value.reviewStatus === "string"
    && ALLOWED_MAPPING_STATUSES.has(value.reviewStatus);
}

function validCurrentSenseProjection(value: JsonRecord) {
  return nonEmptyString(value.masterSenseIdentity)
    && typeof value.contentHash === "string"
    && SHA256_PATTERN.test(value.contentHash)
    && value.contentReviewStatus === "PASS"
    && value.editorialStatus === "DRAFT"
    && value.enabled === true;
}

function singleImageUrl(record: JsonRecord): string | null {
  const media = isRecord(record.developmentMedia) ? record.developmentMedia : null;
  const items = list(media?.images);
  if (items.length === 0) return null;

  const currentIdentity = record.masterSenseIdentity;
  const currentHash = record.contentHash;
  if (!nonEmptyString(currentIdentity) || !nonEmptyString(currentHash)) return null;
  const mappedItems = items.filter((item): item is JsonRecord => isRecord(item)
    && item.targetProposalKey === currentIdentity
    && item.targetContentSha256 === currentHash);
  if (mappedItems.length === 0 || !mappedItems.every(validMappingItem)) return null;
  if (mappedItems.some((item) => item.rightsStatus !== "UNKNOWN_REVIEW_REQUIRED")) return null;

  const hashes = new Set(mappedItems.map((item) => item.mediaSha256));
  if (hashes.size !== 1) return null;

  // Ignore stale target/hash pins, but keep an ambiguous current mapping closed.
  // Source references may repeat one physical image for the same Sense. Treat
  // identical hashes as one asset, but leave distinct images unresolved.
  const urls = mappedItems
    .filter((item) => validSignedCloudinaryUrl(item.url, "image", item.mimeType))
    .sort((left, right) => String(left.sourceNoteIdentity).localeCompare(String(right.sourceNoteIdentity))
      || String(left.url).localeCompare(String(right.url)));
  return typeof urls[0]?.url === "string" ? urls[0].url : null;
}

function pronunciationKey(value: unknown): string | null {
  if (!nonEmptyString(value)) return null;
  return value.normalize("NFKC").trim().replace(/^[/\[]|[/\]]$/g, "").replace(/\s+/g, "");
}

function singleWordAudioUrl(record: JsonRecord): string | null {
  const media = isRecord(record.developmentMedia) ? record.developmentMedia : null;
  const items = list(media?.wordAudio);
  if (items.length !== 1 || !validMappingItem(items[0])) return null;

  const item = items[0];
  const sourcePronunciation = pronunciationKey(item.pronunciation);
  const targetPronunciation = pronunciationKey(record.ipa);
  if (!sourcePronunciation) return null;

  if (targetPronunciation) {
    if (sourcePronunciation !== targetPronunciation || !nonEmptyString(item.pronunciationEvidence)) return null;
  } else if (!hasVerifiedSourcePronunciationForCurrentSense(record, item)) {
    return null;
  }
  return validSignedCloudinaryUrl(item.url, "audio", item.mimeType) ? item.url : null;
}

function hasVerifiedSourcePronunciationForCurrentSense(record: JsonRecord, item: JsonRecord): boolean {
  if (record.ipa != null && nonEmptyString(record.ipa)) return false;
  if (item.pronunciationEvidence !== "SOURCE_NOTE_FIELD_SOUND_AND_IPA") return false;
  if (!nonEmptyString(record.word) || !nonEmptyString(record.partOfSpeech)
    || !nonEmptyString(record.masterSenseIdentity) || typeof record.contentHash !== "string"
    || !SHA256_PATTERN.test(record.contentHash)) return false;
  if (!/^[^:\r\n]{1,128}:[^:\r\n]{1,128}$/.test(String(item.sourceNoteIdentity ?? ""))) return false;

  const evidence = typeof item.mappingEvidence === "string" ? item.mappingEvidence : "";
  const match = evidence.match(/^Source-note Sound\/IPA and lemma\/POS verified for Lexeme ([^;]{1,256}); target hash set ([0-9a-f]{64})\.$/);
  if (!match) return false;

  // This hash fingerprints the whole lexeme's ordered target-sense set, not
  // this one sense's contentHash. validCurrentSenseProjection verifies the
  // current sense identity and content hash independently.
  const lexemeIdentity = match[1];
  const expectedPartOfSpeech = String(record.partOfSpeech).trim().toUpperCase();
  const separator = lexemeIdentity.lastIndexOf("|");
  if (separator < 1 || lexemeIdentity.slice(separator + 1).toUpperCase() !== expectedPartOfSpeech) return false;

  const escapedWord = String(record.word).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordBoundary = new RegExp(`(^|[^\\p{L}\\p{N}])${escapedWord}($|[^\\p{L}\\p{N}])`, "iu");
  return wordBoundary.test(lexemeIdentity.slice(0, separator));
}

function examplesWithExactAudio(record: JsonRecord): unknown[] | undefined {
  const examples = list(record.examples);
  if (examples.length === 0) return undefined;
  const media = isRecord(record.developmentMedia) ? record.developmentMedia : null;
  const candidates = list(media?.exampleAudio);

  return examples.map((value) => {
    if (!isRecord(value) || !nonEmptyString(value.exampleKey)) return value;
    const sameKey = candidates.filter((candidate) => isRecord(candidate) && candidate.exampleKey === value.exampleKey);
    if (sameKey.length !== 1 || !validMappingItem(sameKey[0]) || sameKey[0].reviewStatus !== "ACCEPTED_MAPPING") return value;

    const candidate = sameKey[0];
    if (!validSignedCloudinaryUrl(candidate.url, "audio", candidate.mimeType)) return value;
    return { ...value, audioUrl: candidate.url };
  });
}

/**
 * Removes Development-only source metadata from deployed DTOs. If the exact
 * owner attestation is configured, only unique, non-ambiguous V2 mappings with
 * current PASS/DRAFT identity and a signed V2 Cloudinary URL are published.
 */
export function withoutUnclearedV2Media(value: unknown, env: RuntimeBindings = {}, options: { forcePublicBoundary?: boolean } = {}): unknown {
  if (!options.forcePublicBoundary && !mustSanitizeV2MediaResponse(env)) return value;
  if (Array.isArray(value)) return value.map((item) => withoutUnclearedV2Media(item, env, options));
  if (!isRecord(value)) return value;

  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, withoutUnclearedV2Media(child, env, options)])) as JsonRecord;
  const ownerPublished = ownerPublishedPublicMedia(result, env);
  if (ownerPublished) return ownerPublished;
  if (!nonEmptyString(value.masterSenseIdentity)) return result;

  result.imageUrl = null;
  result.audioUrl = null;
  delete result.developmentMedia;
  delete result.imageMediaStatus;

  if (!hasV2PublicMediaOwnerAuthorization(env) || !validCurrentSenseProjection(value)) return result;

  result.imageUrl = singleImageUrl(value);
  result.audioUrl = singleWordAudioUrl(value);
  const examples = examplesWithExactAudio(value);
  if (examples) result.examples = examples;
  return result;
}
