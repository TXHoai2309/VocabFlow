import type { RuntimeBindings } from "./runtime-bindings";

/**
 * Owner authorization is recorded separately from third-party license evidence.
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
  const acceptedToken = Boolean(token
    && [...url.searchParams.keys()].length === 1
    && token.split("~").some((part) => /^hmac=[a-f0-9]{64}$/i.test(part))
    && token.split("~").some((part) => /^(exp|dur)=\d+$/i.test(part)));
  if (!acceptedPathSignature && !acceptedToken) return false;
  if (acceptedPathSignature && url.searchParams.size > 0) return false;

  let publicIdSegments = pathSegments.slice(acceptedPathSignature ? 4 : 3);
  if (publicIdSegments[0] && /^v\d+$/.test(publicIdSegments[0])) publicIdSegments = publicIdSegments.slice(1);
  if (publicIdSegments.length < 4) return false;

  const expectedNamespace = kind === "image" ? "images" : "audio";
  if (publicIdSegments[0] !== "Vocab" || publicIdSegments[1] !== "v2" || publicIdSegments[2] !== expectedNamespace) return false;
  const extension = publicIdSegments.at(-1)?.split(".").at(-1)?.toLocaleLowerCase();

  if (kind === "audio") return resourceType === "video" && mimeType === "audio/mpeg" && extension === "mp3";
  if (mimeType === "image/jpeg") return resourceType === "image" && (extension === "jpg" || extension === "jpeg");
  if (mimeType === "image/png") return resourceType === "image" && extension === "png";
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
  if (items.length !== 1 || !validMappingItem(items[0])) return null;
  const item = items[0];
  return validSignedCloudinaryUrl(item.url, "image", item.mimeType) ? item.url : null;
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
  if (!sourcePronunciation || !targetPronunciation || sourcePronunciation !== targetPronunciation
    || !nonEmptyString(item.pronunciationEvidence)) return null;
  return validSignedCloudinaryUrl(item.url, "audio", item.mimeType) ? item.url : null;
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
export function withoutUnclearedV2Media(value: unknown, env: RuntimeBindings = {}): unknown {
  if (!mustSanitizeV2MediaResponse(env)) return value;
  if (Array.isArray(value)) return value.map((item) => withoutUnclearedV2Media(item, env));
  if (!isRecord(value)) return value;

  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, withoutUnclearedV2Media(child, env)])) as JsonRecord;
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
