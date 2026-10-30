import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import type { Hono } from "hono";

const ROOT = ".vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0002";
const PLAN_SHA = "9ce4e83ddb69862a5ea8579a0be6f3969a422418980358e945945c85190a0f39";
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Imported only by the Node development entry point, never the Worker. */
export function installEditorialLocalMedia(app: Hono, env: NodeJS.ProcessEnv) {
  let database: URL;
  try { database = new URL(env.DATABASE_URL ?? ""); } catch { return; }
  if (database.hostname !== "127.0.0.1" || database.port !== "55432" || database.pathname !== "/vocabflow_dev"
    || env.VOCABFLOW_ENV !== "development" || env.DATABASE_ENV !== "development"
    || env.EXECUTION_CONTEXT !== "local-development" || env.DATABASE_DRIVER !== "postgres-js" || env.VERCEL_ENV) return;
  let bytes: Buffer;
  try { bytes = readFileSync(`${ROOT}/integration-plan.json`); } catch { return; }
  if (hash(bytes) !== PLAN_SHA) throw new Error("EDITORIAL_LOCAL_PLAN_PIN_MISMATCH");
  const plan = JSON.parse(bytes.toString("utf8")) as { assets: { filename: string; repoRelativePath: string; sha256: string; byteLength: number; mimeType: string }[] };
  const allowed = new Map<string, { bytes: ArrayBuffer; mimeType: string }>();
  const mediaRoot = realpathSync(".vocabflow-local/editorial-refresh-20261028/media-production-r0001/assets");
  for (const asset of plan.assets) {
    const file = realpathSync(asset.repoRelativePath);
    const relative = path.relative(mediaRoot, file);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)
      || !/^[a-f0-9]{64}\.(png|mp3)$/.test(asset.filename)) throw new Error("EDITORIAL_LOCAL_ASSET_PATH_INVALID");
    const content = readFileSync(file);
    if (hash(content) !== asset.sha256 || content.byteLength !== asset.byteLength) throw new Error("EDITORIAL_LOCAL_ASSET_PIN_MISMATCH");
    allowed.set(asset.filename, { bytes: new Uint8Array(content).buffer, mimeType: asset.mimeType });
  }
  app.get("/api/local-editorial-media/:filename", (c) => {
    const host = new URL(c.req.url).hostname;
    if (host !== "127.0.0.1" && host !== "localhost") return c.notFound();
    const asset = allowed.get(c.req.param("filename"));
    if (!asset) return c.notFound();
    c.header("Content-Type", asset.mimeType);
    c.header("Content-Length", String(asset.bytes.byteLength));
    c.header("Cache-Control", "private, max-age=31536000, immutable");
    c.header("X-Content-Type-Options", "nosniff");
    return c.body(asset.bytes);
  });
}
