import path from "node:path";

export const foundationLocalMediaRoot = "../VocabFlow-data/foundation/media";
const priorMediaRoot = ".vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001/assets/audio";

/** Relocate the exact stored identity without editing DB content or its hash. */
export function foundationLocalAudioPath(storedPath: string, sha256: string) {
  const filename = `${sha256}.mp3`;
  if (!/^[a-f0-9]{64}$/.test(sha256)
    || path.relative(path.resolve(priorMediaRoot), path.resolve(storedPath)) !== filename) {
    throw new Error("FOUNDATION_MEDIA_SOURCE_PATH_INVALID");
  }
  return path.resolve(foundationLocalMediaRoot, filename);
}
