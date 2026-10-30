import { describe, expect, it, vi } from "vitest";
import { isExampleAudioUrl } from "./example-audio-url";
describe("example audio source policy", () => {
  it("allows HTTPS and exact local owner routes only in Development", () => {
    vi.stubEnv("DEV", true);
    expect(isExampleAudioUrl("https://media.test/example.mp3")).toBe(true);
    expect(isExampleAudioUrl(`/api/local-owner-editorial-media/${"a".repeat(64)}.mp3`)).toBe(true);
    expect(isExampleAudioUrl("http://remote.test/clip.mp3")).toBe(false);
    expect(isExampleAudioUrl("//remote.test/clip.mp3")).toBe(false);
    expect(isExampleAudioUrl("/api/local-owner-editorial-media/../../private.mp3")).toBe(false);
    vi.stubEnv("DEV", false);
    expect(isExampleAudioUrl(`/api/local-owner-editorial-media/${"a".repeat(64)}.mp3`)).toBe(false);
    vi.unstubAllEnvs();
  });
});
