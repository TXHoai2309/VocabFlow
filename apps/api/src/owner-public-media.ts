import type { RuntimeBindings } from "./runtime-bindings";
import { vocabularyDatasetVersion } from "./vocabulary-dataset-version";

function publishedUrl(value: unknown, kind: "image" | "audio"): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.username || url.password || url.hash
      || [...url.searchParams.keys()].some(key => key !== "_a") || url.searchParams.getAll("_a").length > 1
      || (url.searchParams.has("_a") && !/^[A-Za-z0-9_-]{1,128}$/.test(url.searchParams.get("_a") ?? ""))) return null;
    const path = kind === "image"
      ? /^\/[^/]+\/image\/upload\/(?:[^/]+\/)?v\d+\/vocabflow\/owner\/(?:production-1547-20261030-r0001|production-expansion-4997-20261101-r0001)\/images\/[a-f0-9]{64}\.png$/
      : /^\/[^/]+\/video\/upload\/v\d+\/vocabflow\/owner\/(?:production-1547-20261030-r0001|production-expansion-4997-20261101-r0001)\/audio\/[a-f0-9]{64}\.mp3$/;
    return path.test(url.pathname) ? value : null;
  } catch { return null; }
}

/** A separate owner publication authority; it never fabricates Master PASS. */
export function ownerPublishedPublicMedia(value: Record<string, unknown>, env: RuntimeBindings): Record<string, unknown> | null {
  if (vocabularyDatasetVersion(env) !== "owner-production"
    || typeof value.masterSenseIdentity !== "string" || !/^owner-publication:[a-z0-9-]+$/i.test(value.masterSenseIdentity)
    || typeof value.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(value.contentHash)) return null;
  const result: Record<string, unknown> = { ...value, imageUrl: publishedUrl(value.imageUrl, "image"), audioUrl: publishedUrl(value.audioUrl, "audio") };
  delete result.developmentMedia;
  delete result.imageMediaStatus;
  if (Array.isArray(result.examples)) result.examples = result.examples.map(example => {
    if (!example || typeof example !== "object") return example;
    const { audioUrl, ...text } = example;
    const allowedAudio = publishedUrl(audioUrl, "audio");
    return allowedAudio ? { ...text, audioUrl: allowedAudio } : text;
  });
  return result;
}
