import type { RuntimeBindings } from "./runtime-bindings";

export function mustWithholdV2Media(env: RuntimeBindings) {
  return env.VERCEL_ENV !== undefined || env.VOCABFLOW_ENV === "production" || env.DATABASE_ENV === "production";
}

/** The staged APKG media has no public clearance. Keep its URLs out of deployed DTOs. */
export function withoutUnclearedV2Media(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUnclearedV2Media);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const result = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, withoutUnclearedV2Media(child)]));
  if (typeof record.masterSenseIdentity === "string" && record.masterSenseIdentity.length > 0) {
    result.imageUrl = null;
    result.audioUrl = null;
    delete result.developmentMedia;
    delete result.imageMediaStatus;
  }
  return result;
}
