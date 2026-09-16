import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaManifest } from "./vocab-media-manifest";
import {
  buildUploadSpecs,
  assertCanarySelection,
  parseCliArgs,
  publicIdForAsset,
  runUploader,
  selectCanaryAssets,
  type CloudinaryClient,
  type StoredMediaAsset
} from "./vocab-media-upload";

const temporaryDirectories: string[] = [];

function fixtureDirectory() {
  const root = mkdtempSync(join(tmpdir(), "vocabflow-media-upload-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, "images"), { recursive: true });
  mkdirSync(join(root, "audio"), { recursive: true });
  return root;
}

function asset(type: "image" | "audio", content: Buffer, sourcePath: string) {
  const sha256 = createHash("sha256").update(content).digest("hex");
  return {
    type,
    sha256,
    mediaKey: type === "image" ? `media/v1/images/${sha256}.png` : `media/v1/audio/${sha256}.mp3`,
    sourcePath,
    detectedMimeType: type === "image" ? "image/png" : "audio/mpeg",
    normalizedExtension: type === "image" ? ".png" : ".mp3",
    sourceReferenceCount: 1
  } as const;
}

function manifest(assets: MediaManifest["assets"]): MediaManifest {
  return {
    schemaVersion: 1,
    mediaKeyConvention: {
      image: "media/v1/images/<sha256>.<normalized-extension>",
      audio: "media/v1/audio/<sha256>.mp3"
    },
    records: [],
    assets
  };
}

function client(overrides: Partial<CloudinaryClient> = {}): CloudinaryClient {
  return {
    resource: async () => { throw Object.assign(new Error("not found"), { http_code: 404 }); },
    upload: async (_path, _options) => ({ resource_type: "image", secure_url: "https://res.cloudinary.test/asset", bytes: 12, format: "png" }),
    ...overrides
  };
}

function stored(spec: ReturnType<typeof buildUploadSpecs>[number]): StoredMediaAsset {
  return {
    mediaKey: spec.asset.mediaKey,
    type: spec.asset.type,
    sha256: spec.asset.sha256,
    publicId: spec.publicId,
    resourceType: spec.resourceType,
    format: spec.format,
    status: "UPLOADED"
  };
}

describe("safe Cloudinary media uploader", () => {
  it("requires an explicit apply flag before mutation mode is enabled", () => {
    expect(parseCliArgs([]).apply).toBe(false);
    expect(parseCliArgs(["--apply"]).apply).toBe(true);
    expect(parseCliArgs(["--canary"]).canary).toBe(true);
  });

  it("selects the first image and first audio in stable manifest order", () => {
    const firstImage = asset("image", Buffer.from("first-image"), "images/first.png");
    const secondImage = asset("image", Buffer.from("second-image"), "images/second.png");
    const firstAudio = asset("audio", Buffer.from("first-audio"), "audio/first.mp3");
    const secondAudio = asset("audio", Buffer.from("second-audio"), "audio/second.mp3");
    const selected = selectCanaryAssets([secondAudio, secondImage, firstAudio, firstImage]);
    expect(selected).toEqual([secondImage, secondAudio]);
    expect(selectCanaryAssets([secondAudio, secondImage, firstAudio, firstImage])).toEqual(selected);
  });

  it("fails closed if the canary selection invariant is invalid", () => {
    const image = asset("image", Buffer.from("image"), "images/one.png");
    const secondImage = asset("image", Buffer.from("image-two"), "images/two.png");
    const audio = asset("audio", Buffer.from("audio"), "audio/one.mp3");
    expect(() => assertCanarySelection([image, secondImage, audio])).toThrowError(
      expect.objectContaining({ code: "CANARY_SELECTION_INVALID" })
    );
  });

  it("plans all canonical assets without invoking a Cloudinary mutation", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("image");
    const image = asset("image", bytes, "images/one.png");
    writeFileSync(join(root, image.sourcePath), bytes);
    let uploadCalls = 0;
    const summary = await runUploader({ manifest: manifest([image]), datasetRoot: root, apply: false, client: client({ upload: async () => { uploadCalls += 1; return {}; } }) });
    expect(summary.applyMode).toBe(false);
    expect(summary.uploadCandidateCount).toBe(1);
    expect(summary.localMissingCount).toBe(0);
    expect(uploadCalls).toBe(0);
  });

  it("plans exactly one image and one audio without invoking either Cloudinary operation", async () => {
    const root = fixtureDirectory();
    const imageBytes = Buffer.from("image");
    const audioBytes = Buffer.from("audio");
    const image = asset("image", imageBytes, "images/one.png");
    const audio = asset("audio", audioBytes, "audio/one.mp3");
    const secondImage = asset("image", Buffer.from("second-image"), "images/two.png");
    const secondAudio = asset("audio", Buffer.from("second-audio"), "audio/two.mp3");
    writeFileSync(join(root, image.sourcePath), imageBytes);
    writeFileSync(join(root, audio.sourcePath), audioBytes);
    let resourceCalls = 0;
    let uploadCalls = 0;
    const summary = await runUploader({
      manifest: manifest([image, audio, secondImage, secondAudio]),
      datasetRoot: root,
      apply: false,
      canary: true,
      client: client({
        resource: async () => { resourceCalls += 1; return {}; },
        upload: async () => { uploadCalls += 1; return {}; }
      })
    });
    expect(summary.canaryMode).toBe(true);
    expect(summary.imageCandidateCount).toBe(1);
    expect(summary.audioCandidateCount).toBe(1);
    expect(summary.uploadCandidateCount).toBe(2);
    expect(resourceCalls).toBe(0);
    expect(uploadCalls).toBe(0);
  });

  it("uploads exactly the two selected assets in canary apply mode", async () => {
    const root = fixtureDirectory();
    const imageBytes = Buffer.from("image");
    const audioBytes = Buffer.from("audio");
    const image = asset("image", imageBytes, "images/one.png");
    const audio = asset("audio", audioBytes, "audio/one.mp3");
    const secondImage = asset("image", Buffer.from("second-image"), "images/two.png");
    const secondAudio = asset("audio", Buffer.from("second-audio"), "audio/two.mp3");
    writeFileSync(join(root, image.sourcePath), imageBytes);
    writeFileSync(join(root, audio.sourcePath), audioBytes);
    const uploadedPublicIds: string[] = [];
    const summary = await runUploader({
      manifest: manifest([image, audio, secondImage, secondAudio]),
      datasetRoot: root,
      apply: true,
      canary: true,
      client: client({
        upload: async (_path, options) => {
          uploadedPublicIds.push(options.public_id);
          return { resource_type: options.resource_type };
        }
      }),
      statePath: join(root, "state.json"),
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(summary.uploadedCount).toBe(2);
    expect(summary.uploadCandidateCount).toBe(2);
    expect(uploadedPublicIds).toEqual([publicIdForAsset(image), publicIdForAsset(audio)]);
  });

  it("keeps the full-mode candidate count unaffected by canary mode", async () => {
    const root = fixtureDirectory();
    const image = asset("image", Buffer.from("image"), "images/one.png");
    const secondImage = asset("image", Buffer.from("second-image"), "images/two.png");
    const audio = asset("audio", Buffer.from("audio"), "audio/one.mp3");
    const secondAudio = asset("audio", Buffer.from("second-audio"), "audio/two.mp3");
    writeFileSync(join(root, image.sourcePath), "image");
    writeFileSync(join(root, secondImage.sourcePath), "second-image");
    writeFileSync(join(root, audio.sourcePath), "audio");
    writeFileSync(join(root, secondAudio.sourcePath), "second-audio");
    const full = await runUploader({ manifest: manifest([image, audio, secondImage, secondAudio]), datasetRoot: root, apply: false });
    const canary = await runUploader({ manifest: manifest([image, audio, secondImage, secondAudio]), datasetRoot: root, apply: false, canary: true });
    expect(full.uploadCandidateCount).toBe(4);
    expect(full.imageCandidateCount).toBe(2);
    expect(full.audioCandidateCount).toBe(2);
    expect(canary.uploadCandidateCount).toBe(2);
  });

  it("derives deterministic public IDs and provider resource types", () => {
    const image = asset("image", Buffer.from("image"), "images/one.png");
    const audio = asset("audio", Buffer.from("audio"), "audio/one.mp3");
    const specs = buildUploadSpecs(manifest([image, audio]), fixtureDirectory());
    expect(publicIdForAsset(image)).toBe(`vocabflow/images/content-v1/${image.sha256}`);
    expect(specs.map((spec) => [spec.publicId, spec.resourceType])).toEqual([
      [`vocabflow/images/content-v1/${image.sha256}`, "image"],
      [`vocabflow/audio/content-v1/${audio.sha256}`, "video"]
    ]);
  });

  it("uploads with overwrite disabled and the configured folder", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("image");
    const image = asset("image", bytes, "images/one.png");
    writeFileSync(join(root, image.sourcePath), bytes);
    let received: Record<string, unknown> | undefined;
    const summary = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      client: client({
        upload: async (_path, options) => { received = options; return { resource_type: "image" }; }
      }),
      statePath: join(root, "state.json"),
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(summary.uploadedCount).toBe(1);
    expect(received).toMatchObject({
      asset_folder: "Vocab/images",
      public_id: `vocabflow/images/content-v1/${image.sha256}`,
      resource_type: "image",
      overwrite: false,
      unique_filename: false,
      use_filename: false
    });
  });

  it("maps audio to Cloudinary video resources and uploads a shared canonical asset once", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("audio");
    const audio = asset("audio", bytes, "audio/shared.mp3");
    writeFileSync(join(root, audio.sourcePath), bytes);
    let uploadCalls = 0;
    const summary = await runUploader({
      manifest: manifest([{ ...audio, sourceReferenceCount: 2 }]),
      datasetRoot: root,
      apply: true,
      client: client({ upload: async (_path, options) => { uploadCalls += 1; expect(options.resource_type).toBe("video"); return { resource_type: "video" }; } }),
      statePath: join(root, "state.json"),
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(summary.uploadedCount).toBe(1);
    expect(uploadCalls).toBe(1);
  });

  it("treats an existing matching public ID as safe and does not upload", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("image");
    const image = asset("image", bytes, "images/one.png");
    writeFileSync(join(root, image.sourcePath), bytes);
    let uploadCalls = 0;
    const summary = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      client: client({
        resource: async () => ({ resource_type: "image", bytes: 12 }),
        upload: async () => { uploadCalls += 1; return {}; }
      }),
      statePath: join(root, "state.json"),
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(summary.existingCount).toBe(1);
    expect(uploadCalls).toBe(0);
  });

  it("resumes from a matching checkpoint without contacting Cloudinary", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("image");
    const image = asset("image", bytes, "images/one.png");
    writeFileSync(join(root, image.sourcePath), bytes);
    const spec = buildUploadSpecs(manifest([image]), root)[0];
    const checkpoint = { schemaVersion: 1, assets: { [image.mediaKey]: stored(spec) } };
    const statePath = join(root, "state.json");
    writeFileSync(statePath, JSON.stringify(checkpoint));
    let resourceCalls = 0;
    let uploadCalls = 0;
    const summary = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      client: client({
        resource: async () => { resourceCalls += 1; return {}; },
        upload: async () => { uploadCalls += 1; return {}; }
      }),
      statePath,
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(summary.checkpointSkippedCount).toBe(1);
    expect(resourceCalls).toBe(0);
    expect(uploadCalls).toBe(0);
  });

  it("fails closed when bytes no longer match the manifest hash", async () => {
    const root = fixtureDirectory();
    const image = asset("image", Buffer.from("original"), "images/one.png");
    writeFileSync(join(root, image.sourcePath), "changed");
    let uploadCalls = 0;
    const summary = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      client: client({ upload: async () => { uploadCalls += 1; return {}; } }),
      statePath: join(root, "state.json"),
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(summary.hashMismatchCount).toBe(1);
    expect(uploadCalls).toBe(0);
    expect(JSON.parse(readFileSync(join(root, "failures.json"), "utf8"))).toMatchObject([{ reason: "HASH_MISMATCH" }]);
  });

  it("retries transient errors with bounded backoff and does not retry permanent errors forever", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("image");
    const image = asset("image", bytes, "images/one.png");
    writeFileSync(join(root, image.sourcePath), bytes);
    let transientCalls = 0;
    const transient = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      maxRetries: 2,
      sleep: async () => {},
      client: client({
        resource: async () => { transientCalls += 1; throw Object.assign(new Error("server"), { http_code: 503 }); },
        upload: async () => ({})
      }),
      statePath: join(root, "transient-state.json"),
      failuresPath: join(root, "transient-failures.json"),
      mediaMapPath: join(root, "transient-map.json")
    });
    expect(transient.transientFailureCount).toBe(1);
    expect(transientCalls).toBe(3);

    let permanentCalls = 0;
    const permanent = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      maxRetries: 5,
      sleep: async () => {},
      client: client({
        resource: async () => { permanentCalls += 1; throw Object.assign(new Error("unauthorized"), { http_code: 401 }); },
        upload: async () => ({})
      }),
      statePath: join(root, "permanent-state.json"),
      failuresPath: join(root, "permanent-failures.json"),
      mediaMapPath: join(root, "permanent-map.json")
    });
    expect(permanent.permanentFailureCount).toBe(1);
    expect(permanentCalls).toBe(1);
  });

  it("never includes secret-like values in its sanitized failure report", async () => {
    const root = fixtureDirectory();
    const bytes = Buffer.from("image");
    const image = asset("image", bytes, "images/one.png");
    writeFileSync(join(root, image.sourcePath), bytes);
    const secret = "super-secret-api-value";
    const summary = await runUploader({
      manifest: manifest([image]),
      datasetRoot: root,
      apply: true,
      client: client({
        resource: async () => { throw Object.assign(new Error(`bad ${secret}`), { http_code: 401 }); },
        upload: async () => ({})
      }),
      statePath: join(root, "state.json"),
      failuresPath: join(root, "failures.json"),
      mediaMapPath: join(root, "map.json")
    });
    expect(JSON.stringify(summary)).not.toContain(secret);
    expect(readFileSync(join(root, "failures.json"), "utf8")).not.toContain(secret);
  });
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});
