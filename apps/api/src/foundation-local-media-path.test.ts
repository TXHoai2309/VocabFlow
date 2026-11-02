// @vitest-environment node
import path from "node:path";
import { describe, expect, it } from "vitest";
import { foundationLocalAudioPath, foundationLocalMediaRoot } from "./foundation-local-media-path";

describe("foundation audio relocation", () => {
  const sha = "a".repeat(64);
  const prior = ".vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001/assets/audio";
  it("keeps a stored audio identity while resolving its new local directory", () => {
    expect(foundationLocalAudioPath(`${prior}/${sha}.mp3`, sha)).toBe(path.resolve(foundationLocalMediaRoot, `${sha}.mp3`));
  });
  it.each([
    `${prior}/../${sha}.mp3`,
    `${prior}/nested/${sha}.mp3`,
    `${prior}/${"b".repeat(64)}.mp3`,
    `${prior}/${sha}.png`,
    `unrelated/${sha}.mp3`,
    `https://example.invalid/${sha}.mp3`
  ])("rejects paths outside the exact persisted identity: %s", stored => {
    expect(() => foundationLocalAudioPath(stored, sha)).toThrow("SOURCE_PATH_INVALID");
  });
  it("rejects a non-hash identity", () => {
    expect(() => foundationLocalAudioPath(`${prior}/invalid.mp3`, "invalid")).toThrow("SOURCE_PATH_INVALID");
  });
});
