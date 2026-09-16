import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const DEFAULT_DATASET_ROOT = join(
  process.cwd(),
  "local-data",
  "vocabulary",
  "2000_Common_English_Vocabulary_Dataset"
);
export const DEFAULT_OUTPUT_DIR = join(process.cwd(), "local-data", "generated");
export const MANIFEST_FILENAME = "vocab-media-manifest.json";
export const REPORT_FILENAME = "vocab-media-report.json";

export type MediaType = "image" | "audio";

export type VocabularyMediaRecord = {
  id: number;
  word: string;
  image_files?: unknown;
  audio_files?: unknown;
};

export type MediaMapping = {
  vocabularyId: number;
  word: string;
  imageSourcePath: string | null;
  imageKey: string | null;
  audioSourcePath: string | null;
  audioKey: string | null;
};

export type MediaAsset = {
  type: MediaType;
  sha256: string;
  mediaKey: string;
  sourcePath: string;
  detectedMimeType: string;
  normalizedExtension: string;
  sourceReferenceCount: number;
};

export type MissingMedia = {
  vocabularyId: number;
  word: string;
  sourceReference: string | null;
  reason: "REFERENCE_MISSING" | "FILE_NOT_FOUND";
};

export type InvalidMedia = {
  type: MediaType;
  vocabularyId: number;
  word: string;
  sourcePath: string;
  reason: "UNSUPPORTED_OR_INVALID_IMAGE" | "INVALID_MP3";
};

export type MediaManifest = {
  schemaVersion: 1;
  mediaKeyConvention: {
    image: "media/v1/images/<sha256>.<normalized-extension>";
    audio: "media/v1/audio/<sha256>.mp3";
  };
  records: MediaMapping[];
  assets: MediaAsset[];
};

export type MediaManifestReport = {
  schemaVersion: 1;
  vocabularyRecordCount: number;
  imageReferenceCount: number;
  audioReferenceCount: number;
  physicalImageFileCount: number;
  physicalAudioFileCount: number;
  uniqueImageAssetCount: number;
  uniqueAudioAssetCount: number;
  missingImageCount: number;
  missingAudioCount: number;
  invalidMediaCount: number;
  sharedImageAssetCount: number;
  sharedAudioAssetCount: number;
  deduplicatedImageReferenceCount: number;
  deduplicatedAudioReferenceCount: number;
  missingImages: MissingMedia[];
  missingAudio: MissingMedia[];
  invalidMedia: InvalidMedia[];
};

export type MediaManifestResult = {
  manifest: MediaManifest;
  report: MediaManifestReport;
};

export class MediaManifestError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "MediaManifestError";
    this.code = code;
  }
}

type DetectedMedia = {
  detectedMimeType: string;
  normalizedExtension: string;
};

type ResolvedReference = {
  sourcePath: string;
  absolutePath: string;
};

type MediaReferenceAnalysis =
  | { status: "missing"; missing: MissingMedia }
  | { status: "invalid"; invalid: InvalidMedia; sourcePath: string }
  | { status: "valid"; asset: MediaAsset; sourcePath: string };

const IMAGE_SIGNATURES = {
  png: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  gif87a: Buffer.from("GIF87a", "ascii"),
  gif89a: Buffer.from("GIF89a", "ascii"),
  riff: Buffer.from("RIFF", "ascii"),
  webp: Buffer.from("WEBP", "ascii")
} as const;

function hasPrefix(bytes: Buffer, prefix: Buffer, offset = 0) {
  return bytes.length >= offset + prefix.length && bytes.subarray(offset, offset + prefix.length).equals(prefix);
}

function isPng(bytes: Buffer): boolean {
  if (!hasPrefix(bytes, IMAGE_SIGNATURES.png) || bytes.length < 24) return false;
  const chunkLength = bytes.readUInt32BE(8);
  const chunkType = bytes.toString("ascii", 12, 16);
  return chunkType === "IHDR"
    && chunkLength >= 13
    && bytes.length >= 8 + 4 + 4 + chunkLength
    && bytes.readUInt32BE(16) > 0
    && bytes.readUInt32BE(20) > 0;
}

function isGif(bytes: Buffer): boolean {
  return (hasPrefix(bytes, IMAGE_SIGNATURES.gif87a) || hasPrefix(bytes, IMAGE_SIGNATURES.gif89a))
    && bytes.length >= 10
    && bytes.readUInt16LE(6) > 0
    && bytes.readUInt16LE(8) > 0;
}

function isJpeg(bytes: Buffer): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;

  const hasEndMarker = (start: number) => {
    for (let index = start; index + 1 < bytes.length; index += 1) {
      if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) return true;
    }
    return false;
  };

  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined) return false;
    if (marker === 0xd9) return true;
    if (marker === 0xda) return hasEndMarker(offset);
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;
    if (offset + 1 >= bytes.length) return false;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return false;
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && segmentLength >= 7 && bytes.readUInt16BE(offset + 3) > 0 && bytes.readUInt16BE(offset + 5) > 0) {
      return hasEndMarker(offset + segmentLength);
    }
    offset += segmentLength;
  }
  return false;
}

function isWebp(bytes: Buffer): boolean {
  if (!hasPrefix(bytes, IMAGE_SIGNATURES.riff) || !hasPrefix(bytes, IMAGE_SIGNATURES.webp, 8) || bytes.length < 16) return false;
  const chunkType = bytes.toString("ascii", 12, 16);
  return chunkType === "VP8 " || chunkType === "VP8L" || chunkType === "VP8X";
}

export function detectImageType(bytes: Buffer): DetectedMedia | null {
  if (isPng(bytes)) return { detectedMimeType: "image/png", normalizedExtension: ".png" };
  if (isJpeg(bytes)) return { detectedMimeType: "image/jpeg", normalizedExtension: ".jpg" };
  if (isGif(bytes)) return { detectedMimeType: "image/gif", normalizedExtension: ".gif" };
  if (isWebp(bytes)) return { detectedMimeType: "image/webp", normalizedExtension: ".webp" };
  return null;
}

function isSynchsafeSize(bytes: Buffer, offset: number): boolean {
  return [0, 1, 2, 3].every((index) => (bytes[offset + index] ?? 0) < 0x80);
}

function hasMp3Frame(bytes: Buffer, start: number): boolean {
  for (let offset = start; offset + 3 < bytes.length; offset += 1) {
    if (bytes[offset] !== 0xff || ((bytes[offset + 1] ?? 0) & 0xe0) !== 0xe0) continue;
    const version = ((bytes[offset + 1] ?? 0) >> 3) & 0x03;
    const layer = ((bytes[offset + 1] ?? 0) >> 1) & 0x03;
    const bitrateIndex = ((bytes[offset + 2] ?? 0) >> 4) & 0x0f;
    const sampleRateIndex = ((bytes[offset + 2] ?? 0) >> 2) & 0x03;
    if (version !== 0x01 && layer !== 0 && bitrateIndex !== 0 && bitrateIndex !== 0x0f && sampleRateIndex !== 0x03) return true;
  }
  return false;
}

export function isValidMp3(bytes: Buffer): boolean {
  let start = 0;
  if (hasPrefix(bytes, Buffer.from("ID3", "ascii"))) {
    if (bytes.length < 10 || ![2, 3, 4].includes(bytes[3] ?? -1) || !isSynchsafeSize(bytes, 6)) return false;
    const tagSize = ((bytes[6] ?? 0) << 21) | ((bytes[7] ?? 0) << 14) | ((bytes[8] ?? 0) << 7) | (bytes[9] ?? 0);
    start = 10 + tagSize;
  }
  return start < bytes.length && hasMp3Frame(bytes, start);
}

function normalizeReference(ref: string): string {
  return ref.replaceAll("\\", "/");
}

function isWithin(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath !== ""
    && relativePath !== ".."
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath);
}

function resolveSafeReference(datasetRoot: string, reference: string): ResolvedReference {
  const normalizedReference = normalizeReference(reference);
  if (!normalizedReference
    || normalizedReference.startsWith("/")
    || /^[A-Za-z]:\//.test(normalizedReference)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalizedReference)) {
    throw new MediaManifestError("UNSAFE_MEDIA_PATH", `Unsafe media path: ${reference}`);
  }
  if (normalizedReference.split("/").some((segment) => segment === "..")) {
    throw new MediaManifestError("UNSAFE_MEDIA_PATH", `Path traversal is not allowed: ${reference}`);
  }

  const root = realpathSync(datasetRoot);
  const absolutePath = resolve(root, normalizedReference);
  if (!isWithin(root, absolutePath)) {
    throw new MediaManifestError("UNSAFE_MEDIA_PATH", `Media path escapes dataset root: ${reference}`);
  }

  if (existsSync(absolutePath)) {
    if (!statSync(absolutePath).isFile()) {
      throw new MediaManifestError("MEDIA_REFERENCE_NOT_FILE", `Media reference is not a file: ${reference}`);
    }
    const realPath = realpathSync(absolutePath);
    if (!isWithin(root, realPath)) {
      throw new MediaManifestError("UNSAFE_MEDIA_PATH", `Media symlink escapes dataset root: ${reference}`);
    }
  }

  return {
    sourcePath: normalizedReference,
    absolutePath
  };
}

function mediaReferences(record: VocabularyMediaRecord, type: MediaType): string[] {
  const value = type === "image" ? record.image_files : record.audio_files;
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new MediaManifestError("MEDIA_REFERENCE_SHAPE_INVALID", `Invalid ${type} reference array for vocabulary ${record.id}`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function parseVocabularyRecords(input: unknown): VocabularyMediaRecord[] {
  if (!Array.isArray(input)) throw new MediaManifestError("VOCABULARY_JSON_INVALID", "vocabulary.json must contain an array");
  const ids = new Set<number>();
  const records = input.map((value, index) => {
    if (!value || typeof value !== "object") throw new MediaManifestError("VOCABULARY_JSON_INVALID", `Record ${index} is not an object`);
    const record = value as Record<string, unknown>;
    if (typeof record.id !== "number" || !Number.isSafeInteger(record.id) || record.id < 1) {
      throw new MediaManifestError("VOCABULARY_JSON_INVALID", `Record ${index} has an invalid id`);
    }
    if (typeof record.word !== "string" || record.word.trim() === "") {
      throw new MediaManifestError("VOCABULARY_JSON_INVALID", `Record ${record.id} has an invalid word`);
    }
    if (ids.has(record.id)) throw new MediaManifestError("DUPLICATE_VOCABULARY_ID", `Duplicate vocabulary id: ${record.id}`);
    ids.add(record.id);
    return {
      id: record.id,
      word: record.word,
      image_files: record.image_files,
      audio_files: record.audio_files
    } satisfies VocabularyMediaRecord;
  });
  return records.sort((left, right) => left.id - right.id);
}

function mediaKey(type: MediaType, sha256: string, normalizedExtension: string): string {
  return type === "image"
    ? `media/v1/images/${sha256}${normalizedExtension}`
    : `media/v1/audio/${sha256}.mp3`;
}

function compareLexical(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertManifestInvariants(manifest: MediaManifest, report: MediaManifestReport) {
  const recordIds = new Set(manifest.records.map((record) => record.vocabularyId));
  const assetKeys = new Set(manifest.assets.map((asset) => asset.mediaKey));
  if (recordIds.size !== manifest.records.length
    || assetKeys.size !== manifest.assets.length
    || manifest.records.length !== report.vocabularyRecordCount
    || manifest.assets.filter((asset) => asset.type === "image").length !== report.uniqueImageAssetCount
    || manifest.assets.filter((asset) => asset.type === "audio").length !== report.uniqueAudioAssetCount
    || manifest.records.some((record) => (record.imageKey !== null && !assetKeys.has(record.imageKey))
      || (record.audioKey !== null && !assetKeys.has(record.audioKey)))) {
    throw new MediaManifestError("MANIFEST_INVARIANT_VIOLATION", "Generated manifest failed internal consistency checks");
  }
}

function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function countPhysicalFiles(datasetRoot: string, directory: string): number {
  const directoryPath = join(datasetRoot, directory);
  if (!existsSync(directoryPath)) return 0;
  const entries = readDirectoryFiles(directoryPath);
  return entries.length;
}

function readDirectoryFiles(directoryPath: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) files.push(...readDirectoryFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

export function buildMediaManifest(datasetRootInput = DEFAULT_DATASET_ROOT): MediaManifestResult {
  const datasetRootCandidate = resolve(datasetRootInput);
  if (!existsSync(datasetRootCandidate) || !statSync(datasetRootCandidate).isDirectory()) {
    throw new MediaManifestError("DATASET_ROOT_NOT_FOUND", "Dataset root does not exist");
  }
  const datasetRoot = realpathSync(datasetRootCandidate);
  const vocabularyPath = join(datasetRoot, "vocabulary.json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(vocabularyPath, "utf8"));
  } catch (error) {
    if (error instanceof MediaManifestError) throw error;
    throw new MediaManifestError("VOCABULARY_JSON_INVALID", "Unable to parse vocabulary.json");
  }

  const records = parseVocabularyRecords(parsed);
  const assetsByIdentity = new Map<string, MediaAsset>();
  const hashMetadata = new Map<string, DetectedMedia & { type: MediaType }>();
  const fileCache = new Map<string, DetectedMedia | null>();
  const missingImages: MissingMedia[] = [];
  const missingAudio: MissingMedia[] = [];
  const invalidMedia: InvalidMedia[] = [];
  let imageReferenceCount = 0;
  let audioReferenceCount = 0;

  const analyzeReference = (record: VocabularyMediaRecord, type: MediaType, reference: string | undefined): MediaReferenceAnalysis => {
    const missingCollection = type === "image" ? missingImages : missingAudio;
    if (!reference) {
      const missing = { vocabularyId: record.id, word: record.word, sourceReference: null, reason: "REFERENCE_MISSING" as const };
      missingCollection.push(missing);
      return { status: "missing", missing };
    }

    const resolved = resolveSafeReference(datasetRoot, reference);
    if (!existsSync(resolved.absolutePath)) {
      const missing = { vocabularyId: record.id, word: record.word, sourceReference: resolved.sourcePath, reason: "FILE_NOT_FOUND" as const };
      missingCollection.push(missing);
      return { status: "missing", missing };
    }

    const bytes = readFileSync(resolved.absolutePath);
    const detected = fileCache.has(resolved.absolutePath)
      ? fileCache.get(resolved.absolutePath) ?? null
      : type === "image"
        ? detectImageType(bytes)
        : isValidMp3(bytes)
          ? { detectedMimeType: "audio/mpeg", normalizedExtension: ".mp3" }
          : null;
    fileCache.set(resolved.absolutePath, detected);
    if (!detected || (type === "image" && !detected.detectedMimeType.startsWith("image/")) || (type === "audio" && detected.detectedMimeType !== "audio/mpeg")) {
      const invalid = {
        type,
        vocabularyId: record.id,
        word: record.word,
        sourcePath: resolved.sourcePath,
        reason: type === "image" ? "UNSUPPORTED_OR_INVALID_IMAGE" as const : "INVALID_MP3" as const
      };
      invalidMedia.push(invalid);
      return { status: "invalid", invalid, sourcePath: resolved.sourcePath };
    }

    const sha256 = hashBytes(bytes);
    const previousMetadata = hashMetadata.get(sha256);
    if (previousMetadata && (previousMetadata.type !== type
      || previousMetadata.detectedMimeType !== detected.detectedMimeType
      || previousMetadata.normalizedExtension !== detected.normalizedExtension)) {
      throw new MediaManifestError("HASH_COLLISION_INCOMPATIBLE_METADATA", `Incompatible media metadata for hash ${sha256}`);
    }
    hashMetadata.set(sha256, { ...detected, type });
    const identity = `${type}:${sha256}`;
    const existing = assetsByIdentity.get(identity);
    if (existing) {
      if (existing.detectedMimeType !== detected.detectedMimeType || existing.normalizedExtension !== detected.normalizedExtension) {
        throw new MediaManifestError("HASH_COLLISION_INCOMPATIBLE_METADATA", `Incompatible media metadata for ${type} hash ${sha256}`);
      }
      existing.sourceReferenceCount += 1;
      if (resolved.sourcePath < existing.sourcePath) existing.sourcePath = resolved.sourcePath;
      return { status: "valid", asset: existing, sourcePath: resolved.sourcePath };
    }

    const asset: MediaAsset = {
      type,
      sha256,
      mediaKey: mediaKey(type, sha256, detected.normalizedExtension),
      sourcePath: resolved.sourcePath,
      detectedMimeType: detected.detectedMimeType,
      normalizedExtension: detected.normalizedExtension,
      sourceReferenceCount: 1
    };
    assetsByIdentity.set(identity, asset);
    return { status: "valid", asset, sourcePath: resolved.sourcePath };
  };

  const mappings = records.map((record) => {
    const imageRefs = mediaReferences(record, "image");
    const audioRefs = mediaReferences(record, "audio");
    if (imageRefs.length > 1) throw new MediaManifestError("MULTIPLE_IMAGE_REFERENCES", `Vocabulary ${record.id} has multiple image references`);
    if (audioRefs.length > 1) throw new MediaManifestError("MULTIPLE_AUDIO_REFERENCES", `Vocabulary ${record.id} has multiple audio references`);
    imageReferenceCount += imageRefs.length;
    audioReferenceCount += audioRefs.length;

    const image = analyzeReference(record, "image", imageRefs[0]);
    const audio = analyzeReference(record, "audio", audioRefs[0]);
    return {
      vocabularyId: record.id,
      word: record.word,
      imageSourcePath: image.status === "missing" ? null : image.sourcePath,
      imageKey: image.status === "valid" ? image.asset.mediaKey : null,
      audioSourcePath: audio.status === "missing" ? null : audio.sourcePath,
      audioKey: audio.status === "valid" ? audio.asset.mediaKey : null
    } satisfies MediaMapping;
  });

  const assets = [...assetsByIdentity.values()].sort((left, right) => compareLexical(left.mediaKey, right.mediaKey));
  const imageAssets = assets.filter((asset) => asset.type === "image");
  const audioAssets = assets.filter((asset) => asset.type === "audio");
  const sortMissing = (left: MissingMedia, right: MissingMedia) => left.vocabularyId - right.vocabularyId;
  const sortInvalid = (left: InvalidMedia, right: InvalidMedia) => left.vocabularyId - right.vocabularyId || compareLexical(left.type, right.type);
  const sortedMissingImages = missingImages.sort(sortMissing);
  const sortedMissingAudio = missingAudio.sort(sortMissing);
  const sortedInvalidMedia = invalidMedia.sort(sortInvalid);
  const report: MediaManifestReport = {
    schemaVersion: 1,
    vocabularyRecordCount: records.length,
    imageReferenceCount,
    audioReferenceCount,
    physicalImageFileCount: countPhysicalFiles(datasetRoot, "images"),
    physicalAudioFileCount: countPhysicalFiles(datasetRoot, "audio"),
    uniqueImageAssetCount: imageAssets.length,
    uniqueAudioAssetCount: audioAssets.length,
    missingImageCount: sortedMissingImages.length,
    missingAudioCount: sortedMissingAudio.length,
    invalidMediaCount: sortedInvalidMedia.length,
    sharedImageAssetCount: imageAssets.filter((asset) => asset.sourceReferenceCount > 1).length,
    sharedAudioAssetCount: audioAssets.filter((asset) => asset.sourceReferenceCount > 1).length,
    deduplicatedImageReferenceCount: imageReferenceCount - imageAssets.length,
    deduplicatedAudioReferenceCount: audioReferenceCount - audioAssets.length,
    missingImages: sortedMissingImages,
    missingAudio: sortedMissingAudio,
    invalidMedia: sortedInvalidMedia
  };

  const manifest: MediaManifest = {
      schemaVersion: 1,
      mediaKeyConvention: {
        image: "media/v1/images/<sha256>.<normalized-extension>",
        audio: "media/v1/audio/<sha256>.mp3"
      },
      records: mappings,
      assets
  };
  assertManifestInvariants(manifest, report);
  return { manifest, report };
}

export function writeMediaManifestOutputs(result: MediaManifestResult, outputDirectory = DEFAULT_OUTPUT_DIR) {
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, MANIFEST_FILENAME), `${JSON.stringify(result.manifest, null, 2)}\n`, "utf8");
  writeFileSync(join(outputDirectory, REPORT_FILENAME), `${JSON.stringify(result.report, null, 2)}\n`, "utf8");
}

function parseCliArgs(argv: string[]) {
  let datasetRoot = DEFAULT_DATASET_ROOT;
  let outputDirectory = DEFAULT_OUTPUT_DIR;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dataset-root") {
      const value = argv[index + 1];
      if (!value) throw new MediaManifestError("CLI_ARGUMENT_INVALID", "--dataset-root requires a path");
      datasetRoot = resolve(value);
      index += 1;
    } else if (argument === "--output-dir") {
      const value = argv[index + 1];
      if (!value) throw new MediaManifestError("CLI_ARGUMENT_INVALID", "--output-dir requires a path");
      outputDirectory = resolve(value);
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      console.log("Usage: pnpm run media:manifest [--dataset-root PATH] [--output-dir PATH]");
      process.exit(0);
    } else {
      throw new MediaManifestError("CLI_ARGUMENT_INVALID", `Unknown argument: ${argument}`);
    }
  }
  return { datasetRoot, outputDirectory };
}

function main() {
  try {
    const { datasetRoot, outputDirectory } = parseCliArgs(process.argv.slice(2));
    const result = buildMediaManifest(datasetRoot);
    writeMediaManifestOutputs(result, outputDirectory);
    console.log(`MEDIA_MANIFEST_STATUS=PASS records=${result.report.vocabularyRecordCount}`);
    console.log(`IMAGE_REFERENCES=${result.report.imageReferenceCount} AUDIO_REFERENCES=${result.report.audioReferenceCount}`);
    console.log(`UNIQUE_IMAGE_ASSETS=${result.report.uniqueImageAssetCount} UNIQUE_AUDIO_ASSETS=${result.report.uniqueAudioAssetCount}`);
    console.log(`MISSING_IMAGES=${result.report.missingImageCount} MISSING_AUDIO=${result.report.missingAudioCount} INVALID_MEDIA=${result.report.invalidMediaCount}`);
    console.log(`OUTPUT_DIR=${outputDirectory}`);
  } catch (error) {
    if (error instanceof MediaManifestError) {
      console.error(`MEDIA_MANIFEST_STATUS=FAIL code=${error.code}`);
    } else {
      console.error("MEDIA_MANIFEST_STATUS=FAIL code=UNEXPECTED_ERROR");
    }
    process.exitCode = 1;
  }
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/vocab-media-manifest.ts") || invokedScript.endsWith("/vocab-media-manifest.js")) main();
