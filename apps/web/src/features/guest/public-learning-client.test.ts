import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPublicLearningCache, requestPublicWords } from "./public-learning-client";

const word = (id: number) => ({ id, word: `word-${id}`, vietnamese: "nghĩa", ipa: null, definitionEn: null, exampleEn: null, audioUrl: null, imageUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 });
beforeEach(() => clearPublicLearningCache());
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("bounded public detail transport", () => {
  it("shares cached content across queue, detail and saved consumers", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ vocabulary: [word(1), word(2)] })));
    vi.stubGlobal("fetch", fetch);
    const [first, second] = await Promise.all([requestPublicWords([1, 2]), requestPublicWords([2, 1])]);
    expect(first.map((item) => item.id)).toEqual([1, 2]); expect(second.map((item) => item.id)).toEqual([2, 1]);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("limits parallel batches and bounds each request to 60 IDs", async () => {
    const pending: { ids: number[]; resolve: (response: Response) => void }[] = [];
    const fetch = vi.fn((path: string) => new Promise<Response>((resolve) => {
      const ids = new URL(path, "http://localhost").searchParams.get("ids")!.split(",").map(Number);
      pending.push({ ids, resolve });
    }));
    vi.stubGlobal("fetch", fetch);
    const operation = requestPublicWords(Array.from({ length: 150 }, (_, index) => index + 1));
    expect(fetch).toHaveBeenCalledTimes(2);
    pending[0]!.resolve(new Response(JSON.stringify({ vocabulary: pending[0]!.ids.map(word) })));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    for (const batch of pending.slice(1)) batch.resolve(new Response(JSON.stringify({ vocabulary: batch.ids.map(word) })));
    expect(await operation).toHaveLength(150);
    expect(pending.map((batch) => batch.ids.length)).toEqual([60, 60, 30]);
  });
  it("retries a failed detail batch without poisoning its cached IDs", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ vocabulary: [word(1)] })));
    vi.stubGlobal("fetch", fetch);
    await expect(requestPublicWords([1])).rejects.toThrow("PUBLIC_WORDS_UNAVAILABLE");
    expect(await requestPublicWords([1])).toHaveLength(1); expect(fetch).toHaveBeenCalledTimes(2);
  });
});
