import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildMediaManifest,
  detectImageType,
  isValidMp3
} from "./vocab-media-manifest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function pngFixture() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
}

function mp3Fixture() {
  return Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]);
}

function createDataset(records: unknown[], files: Record<string, Buffer | string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "vocabflow-media-manifest-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, "images"), { recursive: true });
  mkdirSync(join(root, "audio"), { recursive: true });
  writeFileSync(join(root, "vocabulary.json"), JSON.stringify(records));
  for (const [path, content] of Object.entries(files)) {
    const absolutePath = join(root, path);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, content);
  }
  return root;
}

function record(id: number, word: string, image: string[] = [], audio: string[] = []) {
  return { id, word, image_files: image, audio_files: audio };
}

describe("vocabulary media manifest", () => {
  it("detects image content and normalizes an odd source extension", () => {
    expect(detectImageType(pngFixture())).toEqual({ detectedMimeType: "image/png", normalizedExtension: ".png" });
  });

  it("deduplicates shared image and audio content by SHA-256", () => {
    const root = createDataset([
      record(2, "second", ["images/shared.ashx"], ["audio/shared.mp3"]),
      record(1, "first", ["images/shared.ashx"], ["audio/shared.mp3"])
    ], {
      "images/shared.ashx": pngFixture(),
      "audio/shared.mp3": mp3Fixture()
    });

    const result = buildMediaManifest(root);

    expect(result.manifest.records.map((item) => item.vocabularyId)).toEqual([1, 2]);
    expect(result.manifest.assets).toHaveLength(2);
    expect(result.manifest.assets.find((asset) => asset.type === "image")).toMatchObject({
      normalizedExtension: ".png",
      mediaKey: expect.stringMatching(/^media\/v1\/images\/[a-f0-9]{64}\.png$/),
      sourceReferenceCount: 2
    });
    expect(result.manifest.assets.find((asset) => asset.type === "audio")).toMatchObject({
      normalizedExtension: ".mp3",
      mediaKey: expect.stringMatching(/^media\/v1\/audio\/[a-f0-9]{64}\.mp3$/),
      sourceReferenceCount: 2
    });
    expect(result.report.sharedImageAssetCount).toBe(1);
    expect(result.report.sharedAudioAssetCount).toBe(1);
    expect(result.report.deduplicatedImageReferenceCount).toBe(1);
    expect(result.report.deduplicatedAudioReferenceCount).toBe(1);
  });

  it("keeps missing optional media representable without failing", () => {
    const root = createDataset([
      record(1, "missing", ["images/not-found.png"], []),
      record(2, "empty")
    ]);

    const result = buildMediaManifest(root);

    expect(result.report.missingImageCount).toBe(2);
    expect(result.report.missingAudioCount).toBe(2);
    expect(result.manifest.records).toEqual([
      {
        vocabularyId: 1,
        word: "missing",
        imageSourcePath: null,
        imageKey: null,
        audioSourcePath: null,
        audioKey: null
      },
      {
        vocabularyId: 2,
        word: "empty",
        imageSourcePath: null,
        imageKey: null,
        audioSourcePath: null,
        audioKey: null
      }
    ]);
  });

  it("reports invalid image and audio content", () => {
    const root = createDataset([
      record(1, "invalid", ["images/invalid.png"], ["audio/invalid.mp3"])
    ], {
      "images/invalid.png": "not an image",
      "audio/invalid.mp3": "not an mp3"
    });

    const result = buildMediaManifest(root);

    expect(result.report.invalidMediaCount).toBe(2);
    expect(result.report.invalidMedia).toEqual([
      { type: "audio", vocabularyId: 1, word: "invalid", sourcePath: "audio/invalid.mp3", reason: "INVALID_MP3" },
      { type: "image", vocabularyId: 1, word: "invalid", sourcePath: "images/invalid.png", reason: "UNSUPPORTED_OR_INVALID_IMAGE" }
    ]);
    expect(result.manifest.records[0]).toMatchObject({ imageSourcePath: "images/invalid.png", imageKey: null, audioSourcePath: "audio/invalid.mp3", audioKey: null });
    expect(isValidMp3(mp3Fixture())).toBe(true);
  });

  it("rejects traversal references before reading outside the dataset", () => {
    const root = createDataset([record(1, "unsafe", ["../outside.png"]) ]);

    expect(() => buildMediaManifest(root)).toThrowError(
      expect.objectContaining({ code: "UNSAFE_MEDIA_PATH" })
    );
  });

  it("fails closed on duplicate vocabulary IDs", () => {
    const root = createDataset([record(1, "one"), record(1, "duplicate")]);

    expect(() => buildMediaManifest(root)).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_VOCABULARY_ID" })
    );
  });

  it("produces deterministic output independent of input order", () => {
    const files = { "images/one": pngFixture(), "audio/one.mp3": mp3Fixture() };
    const first = buildMediaManifest(createDataset([
      record(2, "two", ["images/one"], ["audio/one.mp3"]),
      record(1, "one", ["images/one"], ["audio/one.mp3"])
    ], files));
    const second = buildMediaManifest(createDataset([
      record(1, "one", ["images/one"], ["audio/one.mp3"]),
      record(2, "two", ["images/one"], ["audio/one.mp3"])
    ], files));

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("does not confuse duplicate normalized words with duplicate IDs", () => {
    const root = createDataset([record(1, "Same"), record(2, " same ")]);

    expect(() => buildMediaManifest(root)).not.toThrow();
    expect(buildMediaManifest(root).manifest.records).toHaveLength(2);
  });
});
