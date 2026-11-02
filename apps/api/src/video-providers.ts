import { z } from "zod";
import { parseTimedSubtitles } from "@vocabflow/learning-domain";
import type { NativeQuota } from "@vocabflow/contracts";
export class ProviderFailure extends Error { constructor(readonly reason: string) { super(reason); } }
export async function providerJson(response: Response, max = 2_000_000): Promise<unknown> {
  if (!response.body) throw new ProviderFailure("INVALID_PROVIDER_DATA");
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let length = 0;
  for (;;) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > max) { await reader.cancel(); throw new ProviderFailure("PROVIDER_TOO_LARGE"); } parts.push(chunk.value); }
  try { const all = new Uint8Array(length); let offset = 0; for (const part of parts) { all.set(part, offset); offset += part.length; } return JSON.parse(new TextDecoder().decode(all)) as unknown; } catch { throw new ProviderFailure("INVALID_PROVIDER_DATA"); }
}
const stamp = (ms: number) => `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
export function nativeToSrt(value: unknown): string {
  const parsed = z.object({ lang: z.string(), content: z.array(z.object({ text: z.string().min(1).max(2000), offset: z.number().int().nonnegative(), duration: z.number().int().positive(), lang: z.string().optional() })).min(1).max(5000) }).safeParse(value);
  if (!parsed.success) throw new ProviderFailure("INVALID_TIMED_TRANSCRIPT");
  if (!/^en(?:-|$)/i.test(parsed.data.lang) || parsed.data.content.some(cue => cue.lang && !/^en(?:-|$)/i.test(cue.lang))) throw new ProviderFailure("ENGLISH_UNAVAILABLE");
  const text = parsed.data.content.map((cue, i) => `${i + 1}\n${stamp(cue.offset)} --> ${stamp(cue.offset + cue.duration)}\n${cue.text}`).join("\n\n");
  try { parseTimedSubtitles(text, "srt", "en"); } catch { throw new ProviderFailure("INVALID_TIMED_TRANSCRIPT"); } return text;
}
export type NativeProvider = { quota: () => Promise<NativeQuota>; start: (url: string) => Promise<{ jobId: string } | { text: string }>; poll: (job: string) => Promise<{ waiting: true } | { text: string }> };
export function supadataProvider(key: string | undefined, request: typeof fetch = fetch): NativeProvider {
  async function get(path: string) { if (!key) throw new ProviderFailure("PROVIDER_NOT_CONFIGURED"); let response: Response;
    try { response = await request(`https://api.supadata.ai/v1/${path}`, { headers: { "x-api-key": key }, redirect: "error", signal: AbortSignal.timeout(20000) }); } catch { throw new ProviderFailure("DELIVERY_UNCERTAIN"); }
    if (![200, 202].includes(response.status)) throw new ProviderFailure(response.status === 429 || response.status === 402 ? "QUOTA_OR_RATE_LIMIT" : response.status === 401 || response.status === 403 ? "PROVIDER_ACCESS_DENIED" : response.status === 404 ? "TRANSCRIPT_UNAVAILABLE" : "PROVIDER_FAILED");
    return { status: response.status, data: await providerJson(response) };
  }
  return {
    async quota() { try { const { data } = await get("me"), parsed = z.object({ plan: z.string(), maxCredits: z.number().int().nonnegative(), usedCredits: z.number().int().nonnegative() }).parse(data); const remaining = Math.max(0, parsed.maxCredits - parsed.usedCredits); return { available: /^free(?:\s|\(|$)/i.test(parsed.plan) && remaining > 0 && parsed.maxCredits <= 100, remaining, reason: !/^free(?:\s|\(|$)/i.test(parsed.plan) || parsed.maxCredits > 100 ? "FREE_PLAN_REQUIRED" : remaining ? null : "QUOTA_EXHAUSTED" }; } catch { return { available: false, remaining: null, reason: "QUOTA_UNKNOWN" }; } },
    async start(url) { const { status, data } = await get(`transcript?${new URLSearchParams({ url, lang: "en", text: "false", mode: "native" })}`); if (status === 202) { const result = z.object({ jobId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/) }).safeParse(data); if (!result.success) throw new ProviderFailure("DELIVERY_UNCERTAIN"); return result.data; } return { text: nativeToSrt(data) }; },
    async poll(job) { const { data } = await get(`transcript/${encodeURIComponent(job)}`), result = z.object({ status: z.enum(["queued", "active", "completed", "failed"]) }).safeParse(data); if (!result.success) throw new ProviderFailure("INVALID_PROVIDER_DATA"); if (result.data.status === "failed") throw new ProviderFailure("TRANSCRIPT_UNAVAILABLE"); if (result.data.status !== "completed") return { waiting: true }; return { text: nativeToSrt(data) }; }
  };
}
export type TranslationProvider = { quota: () => Promise<{ available: boolean; remaining: number | null; reason: string | null }>; translate: (text: string[]) => Promise<string[]> };
export function deeplProvider(key: string | undefined, request: typeof fetch = fetch): TranslationProvider {
  const base = "https://api-free.deepl.com";
  async function call(path: string, body?: unknown) { if (!key) throw new ProviderFailure("PROVIDER_NOT_CONFIGURED"); let response: Response;
    try { response = await request(base + path, { method: body === undefined ? "GET" : "POST", headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "error", signal: AbortSignal.timeout(20000) }); } catch { throw new ProviderFailure("DELIVERY_UNCERTAIN"); }
    if (response.status !== 200) throw new ProviderFailure(response.status === 456 ? "QUOTA_EXHAUSTED" : response.status === 429 ? "RATE_LIMIT" : response.status === 403 ? "PROVIDER_ACCESS_DENIED" : "PROVIDER_FAILED"); return providerJson(response);
  }
  return {
    async quota() { try { const usage = z.object({ character_count: z.number().int().nonnegative(), character_limit: z.number().int().positive().max(1000000), products: z.never().optional() }).parse(await call("/v2/usage"));
      const languages = z.array(z.object({ lang: z.string(), usable_as_source: z.boolean(), usable_as_target: z.boolean(), status: z.string() })).parse(await call("/v3/languages?resource=translate_text"));
      if (!languages.some(l => l.lang.toLowerCase() === "en" && l.usable_as_source && l.status === "stable") || !languages.some(l => l.lang.toLowerCase() === "vi" && l.usable_as_target && l.status === "stable")) throw new ProviderFailure("LANGUAGE_UNAVAILABLE");
      const remaining = Math.max(0, usage.character_limit - usage.character_count); return { available: remaining > 0, remaining, reason: remaining ? null : "QUOTA_EXHAUSTED" }; } catch { return { available: false, remaining: null, reason: "QUOTA_OR_LANGUAGE_UNKNOWN" }; } },
    async translate(text) { const body = { text, source_lang: "EN", target_lang: "VI", context: text.join("\n") }; if (new TextEncoder().encode(JSON.stringify(body)).length > 128 * 1024) throw new ProviderFailure("SOURCE_TOO_LARGE");
      const data = z.object({ translations: z.array(z.object({ text: z.string().trim().min(1).max(8000) })).max(50) }).safeParse(await call("/v2/translate", body)); if (!data.success || data.data.translations.length !== text.length) throw new ProviderFailure("INVALID_TRANSLATION"); return data.data.translations.map(item => item.text); }
  };
}
