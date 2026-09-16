import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { Readable, Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import type { MediaAsset, MediaManifest } from "./vocab-media-manifest";
import { DEFAULT_DATASET_ROOT, DEFAULT_OUTPUT_DIR, MANIFEST_FILENAME } from "./vocab-media-manifest";

export const DEFAULT_MANIFEST_PATH = join(DEFAULT_OUTPUT_DIR, MANIFEST_FILENAME);
export const DEFAULT_STATE_PATH = join(DEFAULT_OUTPUT_DIR, "cloudinary-upload-state.json");
export const DEFAULT_FAILURES_PATH = join(DEFAULT_OUTPUT_DIR, "cloudinary-upload-failures.json");
export const DEFAULT_UNUSABLE_PATH = join(DEFAULT_OUTPUT_DIR, "cloudinary-upload-unusable.json");
export const DEFAULT_MEDIA_MAP_PATH = join(DEFAULT_OUTPUT_DIR, "cloudinary-media-map.json");
export const DEFAULT_CONCURRENCY = 3;
export const MAX_CONCURRENCY = 5;
export const DEFAULT_MAX_RETRIES = 3;
export const CLOUDINARY_UPLOAD_TIMEOUT_MS = 120_000;

const IMAGE_FOLDER = "Vocab/images";
const AUDIO_FOLDER = "Vocab/audio";

export type CloudinaryResourceType = "image" | "video";
export type UploadSuccessStatus = "UPLOADED" | "EXISTS";
export type UploadCheckpointStatus = UploadSuccessStatus | "UNUSABLE_SOURCE_MEDIA";

export type CloudinaryUploadResponse = {
  public_id?: string;
  resource_type?: string;
  secure_url?: string;
  bytes?: number;
  format?: string;
};

export type CloudinaryClient = {
  upload: (
    source: Readable,
    options: CloudinaryUploadOptions
  ) => Promise<CloudinaryUploadResponse>;
};

export type CloudinaryUploadOptions = {
  asset_folder: string;
  public_id: string;
  resource_type: CloudinaryResourceType;
  format: string;
  overwrite: false;
  unique_filename: false;
  use_filename: false;
  timeout: number;
};

export type CloudinaryStreamUploader = {
  upload_stream: (
    options: CloudinaryUploadOptions,
    callback: (error?: unknown, result?: unknown) => void
  ) => Writable;
};

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  imageFolder: string;
  audioFolder: string;
};

export type UploadAssetSpec = {
  asset: MediaAsset;
  absolutePath: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  assetFolder: string;
  format: string;
};

export type StoredMediaAsset = {
  mediaKey: string;
  type: MediaAsset["type"];
  sha256: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  format: string;
  status: UploadCheckpointStatus;
  sanitizedMessage?: string;
  secureUrl?: string;
  bytes?: number;
};

export type UploadCheckpoint = {
  schemaVersion: 1;
  assets: Record<string, StoredMediaAsset>;
};

export type CloudinaryMediaMap = {
  schemaVersion: 1;
  provider: "cloudinary";
  assets: StoredMediaAsset[];
};

export type UnusableSourceMedia = {
  mediaKey: string;
  type: MediaAsset["type"];
  sha256: string;
  sourcePath: string;
  publicId: string;
  reason: "UNSUPPORTED_MEDIA_FORMAT";
  sanitizedMessage: string;
};

export type UploadFailure = {
  mediaKey: string;
  type: MediaAsset["type"];
  sha256: string;
  sourcePath: string;
  publicId: string;
  stage: "local" | "upload";
  reason: string;
  httpCode?: number;
  sanitizedMessage?: string;
};

export type UploadRunSummary = {
  canaryMode: boolean;
  applyMode: boolean;
  uploadCandidateCount: number;
  imageCandidateCount: number;
  audioCandidateCount: number;
  uploadedCount: number;
  existingCount: number;
  checkpointSkippedCount: number;
  unusableSourceMediaCount: number;
  localMissingCount: number;
  hashMismatchCount: number;
  transientFailureCount: number;
  permanentFailureCount: number;
  failures: UploadFailure[];
  unusableSourceMedia: UnusableSourceMedia[];
};

export type RunUploaderOptions = {
  manifest: MediaManifest;
  datasetRoot?: string;
  apply: boolean;
  canary?: boolean;
  client?: CloudinaryClient;
  imageFolder?: string;
  audioFolder?: string;
  concurrency?: number;
  maxRetries?: number;
  statePath?: string;
  failuresPath?: string;
  unusablePath?: string;
  mediaMapPath?: string;
  sleep?: (milliseconds: number) => Promise<void>;
  redactValues?: readonly string[];
};

export class MediaUploadError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "MediaUploadError";
    this.code = code;
  }
}

export function assertCanarySelection(assets: MediaAsset[]): void {
  const imageCount = assets.filter((asset) => asset.type === "image").length;
  const audioCount = assets.filter((asset) => asset.type === "audio").length;
  if (imageCount !== 1 || audioCount !== 1 || assets.length !== 2) {
    throw new MediaUploadError("CANARY_SELECTION_INVALID");
  }
}

export function selectCanaryAssets(assets: MediaAsset[]): MediaAsset[] {
  const image = assets.find((asset) => asset.type === "image");
  const audio = assets.find((asset) => asset.type === "audio");
  const selected = [image, audio].filter((asset): asset is MediaAsset => asset !== undefined);
  assertCanarySelection(selected);
  return selected;
}

class SanitizedCloudinaryError extends MediaUploadError {
  readonly transient: boolean;
  readonly httpCode?: number;
  readonly alreadyExists: boolean;
  readonly retryAfterMs?: number;
  readonly sanitizedMessage: string;
  readonly unsupportedMedia: boolean;

  constructor(
    reason: string,
    transient: boolean,
    httpCode: number | undefined,
    alreadyExists: boolean,
    retryAfterMs: number | undefined,
    sanitizedMessage: string,
    unsupportedMedia: boolean
  ) {
    super(reason);
    this.transient = transient;
    this.httpCode = httpCode;
    this.alreadyExists = alreadyExists;
    this.retryAfterMs = retryAfterMs;
    this.sanitizedMessage = sanitizedMessage;
    this.unsupportedMedia = unsupportedMedia;
  }
}

type UnknownRecord = Record<string, unknown>;
type FailureClassification = {
  reason: string;
  transient: boolean;
  httpCode?: number;
  retryAfterMs?: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function numberProperty(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = value[key];
  return typeof candidate === "number" && Number.isInteger(candidate) ? candidate : undefined;
}

function nestedError(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  return value.error;
}

function httpCodeOf(error: unknown): number | undefined {
  return numberProperty(error, "http_code")
    ?? numberProperty(error, "statusCode")
    ?? numberProperty(error, "status")
    ?? numberProperty(nestedError(error), "http_code");
}

function errorCodeOf(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && isRecord(error.error) && typeof error.error.message === "string") {
    return error.error.message;
  }
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return "";
}

function retryAfterHeader(error: unknown): unknown {
  if (!isRecord(error)) return undefined;
  const headers = error.headers;
  if (isRecord(headers)) return headers["retry-after"] ?? headers["Retry-After"];
  const response = error.response;
  if (isRecord(response) && isRecord(response.headers)) {
    return response.headers["retry-after"] ?? response.headers["Retry-After"];
  }
  return undefined;
}

function retryAfterMsOf(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const retryAfterMs = error.retry_after_ms ?? error.retryAfterMs;
  if (typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return Math.min(retryAfterMs, 30_000);
  }
  const retryAfter = error.retry_after ?? error.retryAfter ?? retryAfterHeader(error);
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 30_000);
  }
  if (typeof retryAfter === "string") {
    if (/^\d+(?:\.\d+)?$/.test(retryAfter.trim())) {
      return Math.min(Number(retryAfter.trim()) * 1000, 30_000);
    }
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), 30_000);
  }
  return undefined;
}

function normalizedMessage(error: unknown): string {
  return errorMessageOf(error).replaceAll(/\s+/g, " ").trim();
}

export function sanitizeCloudinaryErrorMessage(error: unknown, redactValues: readonly string[] = []): string {
  if (error instanceof SanitizedCloudinaryError) return error.sanitizedMessage;
  let message = normalizedMessage(error);
  for (const value of redactValues) {
    if (value) message = message.replaceAll(value, "[REDACTED]");
  }
  message = message
    .replaceAll(/cloudinary:\/\/[^\s]+/gi, "[REDACTED_CREDENTIAL_URL]")
    .replaceAll(/https?:\/\/[^\s]+/gi, "[REDACTED_URL]")
    .replaceAll(/((?:api[_ -]?key|api[_ -]?secret|signature|token|password|secret)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replaceAll(/((?:authorization|x-api-key)\s*:\s*)[^\s,;]+/gi, "$1[REDACTED]");
  return message.slice(0, 240) || "Cloudinary request failed";
}

export function classifyCloudinaryError(error: unknown): FailureClassification {
  if (error instanceof SanitizedCloudinaryError) {
    return { reason: error.code, transient: error.transient, httpCode: error.httpCode, retryAfterMs: error.retryAfterMs };
  }
  const httpCode = httpCodeOf(error);
  const errorCode = errorCodeOf(error);
  if (httpCode === 420) return { reason: "HTTP_420", transient: true, httpCode, retryAfterMs: retryAfterMsOf(error) };
  if (httpCode === 499) return { reason: "HTTP_499", transient: true, httpCode, retryAfterMs: retryAfterMsOf(error) };
  if (httpCode === 429) return { reason: "HTTP_429", transient: true, httpCode, retryAfterMs: retryAfterMsOf(error) };
  if (httpCode !== undefined && httpCode >= 500 && httpCode <= 599) {
    return { reason: "HTTP_5XX", transient: true, httpCode, retryAfterMs: retryAfterMsOf(error) };
  }
  if (errorCode === "ECONNRESET" || errorCode === "ETIMEDOUT" || errorCode === "EAI_AGAIN" || errorCode === "ECONNREFUSED") {
    return { reason: "NETWORK_TRANSIENT", transient: true, httpCode, retryAfterMs: retryAfterMsOf(error) };
  }
  if (httpCode !== undefined && httpCode >= 400 && httpCode <= 499) {
    return { reason: `HTTP_${httpCode}`, transient: false, httpCode };
  }
  return { reason: "CLOUDINARY_ERROR", transient: false, httpCode };
}

function isExistingUploadError(error: unknown): boolean {
  if (error instanceof SanitizedCloudinaryError) return error.alreadyExists;
  const code = errorCodeOf(error);
  if (code === "already_exists" || code === "already_exists_ids") return true;
  return normalizedMessage(error).toLowerCase() === "resource already exists";
}

function isUnsupportedMediaUploadError(error: unknown): boolean {
  if (error instanceof SanitizedCloudinaryError) return error.unsupportedMedia;
  const message = normalizedMessage(error).toLowerCase().replace(/[.!]+$/, "");
  return message === "unsupported video format or file"
    || message === "unsupported image format or file";
}

function assertConcurrency(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_CONCURRENCY) {
    throw new MediaUploadError("CONCURRENCY_OUT_OF_RANGE");
  }
  return value;
}

function assertRetries(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 5) throw new MediaUploadError("RETRIES_OUT_OF_RANGE");
  return value;
}

function assertManifest(manifest: MediaManifest): asserts manifest is MediaManifest {
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
    throw new MediaUploadError("MANIFEST_INVALID");
  }
  const seenKeys = new Set<string>();
  for (const asset of manifest.assets) {
    if (!isRecord(asset)
      || (asset.type !== "image" && asset.type !== "audio")
      || typeof asset.sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(asset.sha256)
      || typeof asset.mediaKey !== "string"
      || typeof asset.sourcePath !== "string"
      || typeof asset.normalizedExtension !== "string") {
      throw new MediaUploadError("MANIFEST_INVALID");
    }
    if (seenKeys.has(asset.mediaKey)) throw new MediaUploadError("DUPLICATE_MEDIA_KEY");
    seenKeys.add(asset.mediaKey);
  }
}

export function loadMediaManifest(manifestPath = DEFAULT_MANIFEST_PATH): MediaManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new MediaUploadError("MANIFEST_NOT_READABLE");
  }
  assertManifest(parsed as MediaManifest);
  return parsed as MediaManifest;
}

export function publicIdForAsset(asset: Pick<MediaAsset, "type" | "sha256">): string {
  return asset.type === "image"
    ? `vocabflow/images/content-v1/${asset.sha256}`
    : `vocabflow/audio/content-v1/${asset.sha256}`;
}

export function resourceTypeForAsset(type: MediaAsset["type"]): CloudinaryResourceType {
  return type === "image" ? "image" : "video";
}

function safeDatasetPath(datasetRoot: string, sourcePath: string): string {
  const root = resolve(datasetRoot);
  const candidate = resolve(root, sourcePath);
  const candidateRelative = relative(root, candidate);
  if (!candidateRelative || candidateRelative === ".." || candidateRelative.startsWith(`..${sep}`) || isAbsolute(candidateRelative)) {
    throw new MediaUploadError("UNSAFE_MEDIA_PATH");
  }
  return candidate;
}

function formatForAsset(asset: MediaAsset): string {
  if (asset.type === "audio") return "mp3";
  const format = asset.normalizedExtension.replace(/^\./, "").toLowerCase();
  if (!/^[a-z0-9]+$/.test(format)) throw new MediaUploadError("MANIFEST_INVALID");
  return format;
}

export function buildUploadSpecs(
  manifest: MediaManifest,
  datasetRoot = DEFAULT_DATASET_ROOT,
  imageFolder = IMAGE_FOLDER,
  audioFolder = AUDIO_FOLDER
): UploadAssetSpec[] {
  assertManifest(manifest);
  return manifest.assets.map((asset) => ({
    asset,
    absolutePath: safeDatasetPath(datasetRoot, asset.sourcePath),
    publicId: publicIdForAsset(asset),
    resourceType: resourceTypeForAsset(asset.type),
    assetFolder: asset.type === "image" ? imageFolder : audioFolder,
    format: formatForAsset(asset)
  }));
}

type LocalVerification = {
  status: "OK" | "LOCAL_FILE_MISSING" | "HASH_MISMATCH";
  bytes?: Buffer;
};

function verifyLocalFile(spec: UploadAssetSpec): LocalVerification {
  if (!existsSync(spec.absolutePath) || !statSync(spec.absolutePath).isFile()) {
    return { status: "LOCAL_FILE_MISSING" };
  }
  const bytes = readFileSync(spec.absolutePath);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  return actualHash === spec.asset.sha256 ? { status: "OK", bytes } : { status: "HASH_MISMATCH" };
}

function safeBytes(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function storedAsset(
  spec: UploadAssetSpec,
  status: UploadCheckpointStatus,
  response: CloudinaryUploadResponse = {}
): StoredMediaAsset {
  return {
    mediaKey: spec.asset.mediaKey,
    type: spec.asset.type,
    sha256: spec.asset.sha256,
    publicId: spec.publicId,
    resourceType: spec.resourceType,
    format: typeof response.format === "string" && response.format !== "" ? response.format : spec.format,
    status,
    ...(typeof response.secure_url === "string" && response.secure_url !== "" ? { secureUrl: response.secure_url } : {}),
    ...(safeBytes(response.bytes) !== undefined ? { bytes: safeBytes(response.bytes) } : {})
  };
}

function validStoredAsset(value: unknown, spec: UploadAssetSpec): value is StoredMediaAsset {
  return isRecord(value)
    && value.mediaKey === spec.asset.mediaKey
    && value.sha256 === spec.asset.sha256
    && value.publicId === spec.publicId
    && value.resourceType === spec.resourceType
    && (value.status === "UPLOADED" || value.status === "EXISTS" || value.status === "UNUSABLE_SOURCE_MEDIA")
    && typeof value.format === "string";
}

function emptyCheckpoint(): UploadCheckpoint {
  return { schemaVersion: 1, assets: {} };
}

function readCheckpoint(path: string): UploadCheckpoint {
  if (!existsSync(path)) return emptyCheckpoint();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as UploadCheckpoint;
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.assets)) throw new Error();
    return parsed;
  } catch {
    throw new MediaUploadError("CHECKPOINT_INVALID");
  }
}

function writeJsonAtomic(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

function mediaMapFromCheckpoint(checkpoint: UploadCheckpoint): CloudinaryMediaMap {
  return {
    schemaVersion: 1,
    provider: "cloudinary",
    assets: Object.values(checkpoint.assets)
      .filter((asset) => asset.status === "UPLOADED" || asset.status === "EXISTS")
      .sort((left, right) => left.mediaKey.localeCompare(right.mediaKey))
  };
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  sleep: (milliseconds: number) => Promise<void>,
  redactValues: readonly string[]
): Promise<T> {
  let retryCount = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      const classification = classifyCloudinaryError(error);
      if (!classification.transient || retryCount >= maxRetries) {
        throw new SanitizedCloudinaryError(
          classification.reason,
          classification.transient,
          classification.httpCode,
          isExistingUploadError(error),
          classification.retryAfterMs,
          sanitizeCloudinaryErrorMessage(error, redactValues),
          isUnsupportedMediaUploadError(error)
        );
      }
      retryCount += 1;
      const exponentialDelay = 250 * (2 ** (retryCount - 1));
      const jitter = Math.floor(Math.random() * Math.max(1, exponentialDelay * 0.25));
      await sleep(Math.min(30_000, classification.retryAfterMs ?? exponentialDelay + jitter));
    }
  }
}

function failureFor(
  spec: UploadAssetSpec,
  stage: UploadFailure["stage"],
  reason: string,
  httpCode?: number,
  sanitizedMessage?: string
): UploadFailure {
  return {
    mediaKey: spec.asset.mediaKey,
    type: spec.asset.type,
    sha256: spec.asset.sha256,
    sourcePath: spec.asset.sourcePath,
    publicId: spec.publicId,
    stage,
    reason,
    ...(httpCode === undefined ? {} : { httpCode }),
    ...(sanitizedMessage === undefined ? {} : { sanitizedMessage })
  };
}

async function processAsset(
  spec: UploadAssetSpec,
  client: CloudinaryClient,
  checkpoint: UploadCheckpoint,
  maxRetries: number,
  sleep: (milliseconds: number) => Promise<void>,
  redactValues: readonly string[]
): Promise<{ status: "CHECKPOINT_SKIPPED" | UploadSuccessStatus | "UNUSABLE_SOURCE_MEDIA" | "FAILED"; stored?: StoredMediaAsset; failure?: UploadFailure; unusable?: UnusableSourceMedia }> {
  const localVerification = verifyLocalFile(spec);
  if (localVerification.status !== "OK") {
    return { status: "FAILED", failure: failureFor(spec, "local", localVerification.status) };
  }

  const previous = checkpoint.assets[spec.asset.mediaKey];
  if (validStoredAsset(previous, spec)) {
    if (previous.status === "UNUSABLE_SOURCE_MEDIA") {
      return {
        status: "UNUSABLE_SOURCE_MEDIA",
        stored: previous,
        unusable: {
          mediaKey: previous.mediaKey,
          type: previous.type,
          sha256: previous.sha256,
          sourcePath: spec.asset.sourcePath,
          publicId: previous.publicId,
          reason: "UNSUPPORTED_MEDIA_FORMAT",
          sanitizedMessage: previous.sanitizedMessage ?? "Unsupported media format or file"
        }
      };
    }
    return { status: "CHECKPOINT_SKIPPED", stored: previous };
  }

  try {
    const uploaded = await retryOperation(
      () => client.upload(Readable.from([localVerification.bytes as Buffer]), {
        asset_folder: spec.assetFolder,
        public_id: spec.publicId,
        resource_type: spec.resourceType,
        format: spec.format,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS
      }),
      maxRetries,
      sleep,
      redactValues
    );
    if (uploaded.resource_type !== undefined && uploaded.resource_type !== spec.resourceType) {
      return { status: "FAILED", failure: failureFor(spec, "upload", "RESOURCE_TYPE_CONFLICT") };
    }
    return { status: "UPLOADED", stored: storedAsset(spec, "UPLOADED", uploaded) };
  } catch (error) {
    if (isUnsupportedMediaUploadError(error)) {
      const unusable = {
        mediaKey: spec.asset.mediaKey,
        type: spec.asset.type,
        sha256: spec.asset.sha256,
        sourcePath: spec.asset.sourcePath,
        publicId: spec.publicId,
        reason: "UNSUPPORTED_MEDIA_FORMAT" as const,
        sanitizedMessage: sanitizeCloudinaryErrorMessage(error, redactValues)
      } satisfies UnusableSourceMedia;
      const stored = storedAsset(spec, "UNUSABLE_SOURCE_MEDIA");
      stored.sanitizedMessage = unusable.sanitizedMessage;
      return {
        status: "UNUSABLE_SOURCE_MEDIA",
        stored,
        unusable
      };
    }
    if (isExistingUploadError(error)) return { status: "EXISTS", stored: storedAsset(spec, "EXISTS") };
    const classification = classifyCloudinaryError(error);
    return {
      status: "FAILED",
      failure: failureFor(
        spec,
        "upload",
        classification.transient ? "TRANSIENT_RETRIES_EXHAUSTED" : classification.reason,
        classification.httpCode,
        sanitizeCloudinaryErrorMessage(error, redactValues)
      )
    };
  }
}

async function runConcurrent<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item === undefined) return;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => runWorker()));
}

function summaryFor(assets: MediaAsset[], apply: boolean, canaryMode: boolean): UploadRunSummary {
  const imageCandidateCount = assets.filter((asset) => asset.type === "image").length;
  const audioCandidateCount = assets.filter((asset) => asset.type === "audio").length;
  return {
    canaryMode,
    applyMode: apply,
    uploadCandidateCount: assets.length,
    imageCandidateCount,
    audioCandidateCount,
    uploadedCount: 0,
    existingCount: 0,
    checkpointSkippedCount: 0,
    unusableSourceMediaCount: 0,
    localMissingCount: 0,
    hashMismatchCount: 0,
    transientFailureCount: 0,
    permanentFailureCount: 0,
    failures: [],
    unusableSourceMedia: []
  };
}

export async function runUploader(options: RunUploaderOptions): Promise<UploadRunSummary> {
  assertManifest(options.manifest);
  const selectedAssets = options.canary ? selectCanaryAssets(options.manifest.assets) : options.manifest.assets;
  const summary = summaryFor(selectedAssets, options.apply, options.canary === true);
  const allSpecs = buildUploadSpecs(
    options.manifest,
    options.datasetRoot ?? DEFAULT_DATASET_ROOT,
    options.imageFolder ?? IMAGE_FOLDER,
    options.audioFolder ?? AUDIO_FOLDER
  );
  const selectedKeys = new Set(selectedAssets.map((asset) => asset.mediaKey));
  const specs = options.canary ? allSpecs.filter((spec) => selectedKeys.has(spec.asset.mediaKey)) : allSpecs;
  if (options.canary) assertCanarySelection(specs.map((spec) => spec.asset));
  if (!options.apply) {
    for (const spec of specs) {
      const localStatus = verifyLocalFile(spec).status;
      if (localStatus === "LOCAL_FILE_MISSING") summary.localMissingCount += 1;
      if (localStatus === "HASH_MISMATCH") summary.hashMismatchCount += 1;
    }
    return summary;
  }

  if (!options.client) throw new MediaUploadError("CLOUDINARY_CLIENT_REQUIRED");
  const concurrency = assertConcurrency(options.concurrency ?? DEFAULT_CONCURRENCY);
  const maxRetries = assertRetries(options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const statePath = options.statePath ?? DEFAULT_STATE_PATH;
  const failuresPath = options.failuresPath ?? DEFAULT_FAILURES_PATH;
  const unusablePath = options.unusablePath
    ?? (options.statePath ? join(dirname(options.statePath), "cloudinary-upload-unusable.json") : DEFAULT_UNUSABLE_PATH);
  const mediaMapPath = options.mediaMapPath ?? DEFAULT_MEDIA_MAP_PATH;
  const checkpoint = readCheckpoint(statePath);
  const defaultSleep = (milliseconds: number) => new Promise<void>((resolveSleep) => setTimeout(resolveSleep, milliseconds));
  const sleep = options.sleep ?? defaultSleep;
  const redactValues = options.redactValues ?? [];
  let persistence = Promise.resolve();

  const persistSuccess = (stored: StoredMediaAsset) => {
    persistence = persistence.then(() => {
      checkpoint.assets[stored.mediaKey] = stored;
      writeJsonAtomic(statePath, checkpoint);
      writeJsonAtomic(mediaMapPath, mediaMapFromCheckpoint(checkpoint));
    });
    return persistence;
  };

  await runConcurrent(specs, concurrency, async (spec) => {
    const result = await processAsset(spec, options.client as CloudinaryClient, checkpoint, maxRetries, sleep, redactValues);
    if (result.stored) await persistSuccess(result.stored);
    if (result.status === "UPLOADED") summary.uploadedCount += 1;
    else if (result.status === "EXISTS") summary.existingCount += 1;
    else if (result.status === "CHECKPOINT_SKIPPED") summary.checkpointSkippedCount += 1;
    else if (result.status === "UNUSABLE_SOURCE_MEDIA" && result.unusable) {
      summary.unusableSourceMediaCount += 1;
      summary.unusableSourceMedia.push(result.unusable);
    }
    else if (result.failure) {
      summary.failures.push(result.failure);
      if (result.failure.reason === "LOCAL_FILE_MISSING") summary.localMissingCount += 1;
      else if (result.failure.reason === "HASH_MISMATCH") summary.hashMismatchCount += 1;
      else if (result.failure.reason === "HTTP_420"
        || result.failure.reason === "HTTP_429"
        || result.failure.reason === "HTTP_499"
        || result.failure.reason === "HTTP_5XX"
        || result.failure.reason === "NETWORK_TRANSIENT"
        || result.failure.reason === "TRANSIENT_RETRIES_EXHAUSTED") summary.transientFailureCount += 1;
      else summary.permanentFailureCount += 1;
    }
  });
  await persistence;
  summary.failures.sort((left, right) => left.mediaKey.localeCompare(right.mediaKey));
  summary.unusableSourceMedia.sort((left, right) => left.mediaKey.localeCompare(right.mediaKey));
  writeJsonAtomic(failuresPath, summary.failures);
  writeJsonAtomic(unusablePath, summary.unusableSourceMedia);
  return summary;
}

export function uploadReadableWithCloudinary(
  source: Readable,
  options: CloudinaryUploadOptions,
  uploader: CloudinaryStreamUploader = cloudinary.uploader as unknown as CloudinaryStreamUploader
): Promise<CloudinaryUploadResponse> {
  return new Promise<CloudinaryUploadResponse>((resolveUpload, rejectUpload) => {
    let settled = false;
    const resolveOnce = (result: CloudinaryUploadResponse) => {
      if (settled) return;
      settled = true;
      resolveUpload(result);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      rejectUpload(error);
    };
    const uploadStream = uploader.upload_stream(options, (error, result) => {
      if (error) {
        rejectOnce(error);
      } else if (result) {
        resolveOnce(result as CloudinaryUploadResponse);
      } else {
        rejectOnce(new MediaUploadError("CLOUDINARY_EMPTY_UPLOAD_RESPONSE"));
      }
    });
    source.once("error", rejectOnce);
    uploadStream.once("error", rejectOnce);
    source.pipe(uploadStream);
  });
}

export function createCloudinaryClient(config: CloudinaryConfig): CloudinaryClient {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true
  });
  return {
    upload: (source, options) => uploadReadableWithCloudinary(source, options)
  };
}

export function loadRepositoryEnv(envPath = join(process.cwd(), ".env")) {
  if (!existsSync(envPath)) return;
  try {
    loadEnvFile(envPath);
  } catch {
    throw new MediaUploadError("ENV_FILE_INVALID");
  }
}

export function readCloudinaryConfig(environment: NodeJS.ProcessEnv = process.env): CloudinaryConfig {
  if (environment.MEDIA_PROVIDER !== "cloudinary") throw new MediaUploadError("MEDIA_PROVIDER_NOT_CLOUDINARY");
  const cloudName = environment.CLOUDINARY_CLOUD_NAME;
  const apiKey = environment.CLOUDINARY_API_KEY;
  const apiSecret = environment.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new MediaUploadError("CLOUDINARY_CREDENTIALS_REQUIRED");
  return {
    cloudName,
    apiKey,
    apiSecret,
    imageFolder: environment.CLOUDINARY_VOCAB_IMAGE_FOLDER || IMAGE_FOLDER,
    audioFolder: environment.CLOUDINARY_VOCAB_AUDIO_FOLDER || AUDIO_FOLDER
  };
}

function parseInteger(value: string | undefined, code: string): number {
  if (!value || !/^\d+$/.test(value)) throw new MediaUploadError(code);
  return Number(value);
}

export function parseCliArgs(argv: string[]) {
  let apply = false;
  let canary = false;
  let manifestPath = DEFAULT_MANIFEST_PATH;
  let datasetRoot = DEFAULT_DATASET_ROOT;
  let concurrency = DEFAULT_CONCURRENCY;
  let maxRetries = DEFAULT_MAX_RETRIES;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") apply = true;
    else if (argument === "--canary") canary = true;
    else if (argument === "--manifest") {
      const value = argv[index + 1];
      if (!value) throw new MediaUploadError("MANIFEST_ARGUMENT_REQUIRED");
      manifestPath = resolve(value);
      index += 1;
    } else if (argument === "--dataset-root") {
      const value = argv[index + 1];
      if (!value) throw new MediaUploadError("DATASET_ROOT_ARGUMENT_REQUIRED");
      datasetRoot = resolve(value);
      index += 1;
    } else if (argument === "--concurrency") {
      concurrency = assertConcurrency(parseInteger(argv[index + 1], "CONCURRENCY_ARGUMENT_INVALID"));
      index += 1;
    } else if (argument === "--max-retries") {
      maxRetries = assertRetries(parseInteger(argv[index + 1], "RETRIES_ARGUMENT_INVALID"));
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      console.log("Usage: pnpm run media:upload [--canary] [--manifest PATH] [--dataset-root PATH] [--concurrency 1-5] [--max-retries 0-5] [--apply]");
      process.exit(0);
    } else {
      throw new MediaUploadError("CLI_ARGUMENT_INVALID");
    }
  }
  return { apply, canary, manifestPath, datasetRoot, concurrency, maxRetries };
}

function printSummary(summary: UploadRunSummary) {
  console.log(`MEDIA_UPLOAD_STATUS=${summary.failures.length === 0 ? "PASS" : "FAIL"}`);
  console.log(`CANARY_MODE=${summary.canaryMode ? "true" : "false"}`);
  console.log(`APPLY_MODE=${summary.applyMode ? "true" : "false"}`);
  console.log(`UPLOAD_CANDIDATES=${summary.uploadCandidateCount}`);
  console.log(`IMAGE_CANDIDATES=${summary.imageCandidateCount} AUDIO_CANDIDATES=${summary.audioCandidateCount}`);
  if (summary.canaryMode) {
    console.log(`IMAGE_SELECTED=${summary.imageCandidateCount}`);
    console.log(`AUDIO_SELECTED=${summary.audioCandidateCount}`);
    console.log(`TOTAL_SELECTED=${summary.uploadCandidateCount}`);
  }
  console.log(`UPLOADED=${summary.uploadedCount} EXISTING=${summary.existingCount} CHECKPOINT_SKIPPED=${summary.checkpointSkippedCount} UNUSABLE_SOURCE_MEDIA=${summary.unusableSourceMediaCount}`);
  console.log(`LOCAL_MISSING=${summary.localMissingCount} HASH_MISMATCH=${summary.hashMismatchCount}`);
  console.log(`TRANSIENT_FAILURES=${summary.transientFailureCount} PERMANENT_FAILURES=${summary.permanentFailureCount}`);
}

async function main() {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    const manifest = loadMediaManifest(args.manifestPath);
    if (!args.apply) {
      printSummary(await runUploader({ manifest, datasetRoot: args.datasetRoot, apply: false, canary: args.canary }));
      return;
    }
    loadRepositoryEnv();
    const config = readCloudinaryConfig();
    const summary = await runUploader({
      manifest,
      datasetRoot: args.datasetRoot,
      apply: true,
      canary: args.canary,
      client: createCloudinaryClient(config),
      imageFolder: config.imageFolder,
      audioFolder: config.audioFolder,
      concurrency: args.concurrency,
      maxRetries: args.maxRetries,
      redactValues: [config.cloudName, config.apiKey, config.apiSecret]
    });
    printSummary(summary);
    if (summary.failures.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`MEDIA_UPLOAD_STATUS=FAIL code=${error instanceof MediaUploadError ? error.code : "UNEXPECTED_ERROR"}`);
    process.exitCode = 1;
  }
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/vocab-media-upload.ts") || invokedScript.endsWith("/vocab-media-upload.js")) void main();
