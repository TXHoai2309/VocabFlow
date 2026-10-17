import { sql, type SQL } from "drizzle-orm";
import type { RuntimeBindings } from "./runtime-bindings";

export type VocabularyDatasetVersion = "legacy" | "v2";
export const MASTER_V2_DEVELOPMENT_SOURCE = "VOCABFLOW_MASTER_V2_DEV";

function isV2ProductionConnection(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:")
      && (url.hostname === "ep-twilight-firefly-a1dugz2x.ap-southeast-1.aws.neon.tech"
        || url.hostname === "ep-twilight-firefly-a1dugz2x-pooler.ap-southeast-1.aws.neon.tech")
      && url.pathname === "/neondb"
      && decodeURIComponent(url.username) === "vocabflow_runtime";
  } catch {
    return false;
  }
}

function isV2DevelopmentConnection(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:")
      && (url.hostname === "ep-ancient-tree-a15xogc1.ap-southeast-1.aws.neon.tech"
        || url.hostname === "ep-ancient-tree-a15xogc1-pooler.c-4.ap-southeast-1.aws.neon.tech")
      && url.pathname === "/neondb"
      && decodeURIComponent(url.username) === "vocabflow_runtime";
  } catch {
    return false;
  }
}

/** Production V2 requires its explicit flag, production markers and staged V2 runtime endpoint. */
export function vocabularyDatasetVersion(env: RuntimeBindings): VocabularyDatasetVersion {
  if (env.VOCAB_DATASET_VERSION?.trim().toLowerCase() !== "v2") return "legacy";
  if (env.VERCEL_ENV === "production"
    && env.VOCABFLOW_ENV === "production"
    && env.DATABASE_ENV === "production"
    && env.EXECUTION_CONTEXT === "vercel-production"
    && isV2ProductionConnection(env.DATABASE_URL)) return "v2";
  if (env.VERCEL_ENV === "preview"
    && env.VOCABFLOW_ENV === "development"
    && env.DATABASE_ENV === "development"
    && env.EXECUTION_CONTEXT === "vercel-preview"
    && isV2DevelopmentConnection(env.DATABASE_URL)) return "v2";
  return env.VOCABFLOW_ENV === "development"
    && env.DATABASE_ENV === "development"
    && env.EXECUTION_CONTEXT === "local-development"
    && !env.VERCEL_ENV
    ? "v2"
    : "legacy";
}

export function vocabularyDatasetPredicate(alias: "v" | "usage_v", version: VocabularyDatasetVersion): SQL {
  return version === "v2"
    ? sql`${sql.raw(alias)}.source_dataset = ${MASTER_V2_DEVELOPMENT_SOURCE}`
    : sql`${sql.raw(alias)}.source_dataset IS DISTINCT FROM ${MASTER_V2_DEVELOPMENT_SOURCE}`;
}

export function jsonArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function jsonObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}
