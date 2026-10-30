import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import type { Hono } from "hono";

type PinnedLocalMedia = {
  planPath: string;
  planSha256: string;
  route: string;
  assetRoots: readonly string[];
};

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Node-only, fixed application-owned config. Never installs in a deployed runtime. */
export function installPinnedLocalMedia(app: Hono, env: NodeJS.ProcessEnv, config: PinnedLocalMedia) {
  let database: URL;
  try { database = new URL(env.DATABASE_URL ?? ""); } catch { return; }
  if (database.hostname !== "127.0.0.1" || database.port !== "55432" || database.pathname !== "/vocabflow_dev"
    || env.VOCABFLOW_ENV !== "development" || env.DATABASE_ENV !== "development"
    || env.EXECUTION_CONTEXT !== "local-development" || env.DATABASE_DRIVER !== "postgres-js" || env.VERCEL_ENV) return;
  let bytes: Buffer;
  try { bytes = readFileSync(config.planPath); } catch { return; }
  if (hash(bytes) !== config.planSha256) throw new Error("LOCAL_MEDIA_PLAN_PIN_MISMATCH");
  const plan = JSON.parse(bytes.toString("utf8")) as { assets: { filename: string; repoRelativePath: string; sha256: string; byteLength: number; mimeType: string }[] };
  const roots = config.assetRoots.map((root) => realpathSync(root));
  const allowed = new Map<string, { bytes: ArrayBuffer; mimeType: string }>();
  for (const asset of plan.assets) {
    const file = realpathSync(asset.repoRelativePath);
    const insideRoot = roots.some((root) => {
      const relative = path.relative(root, file);
      return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    });
    const extension = asset.filename.endsWith(".png") ? "png" : "mp3";
    if (!insideRoot || !/^[a-f0-9]{64}\.(png|mp3)$/.test(asset.filename)
      || asset.filename !== `${asset.sha256}.${extension}`
      || asset.mimeType !== (extension === "png" ? "image/png" : "audio/mpeg")
      || allowed.has(asset.filename)) throw new Error("LOCAL_MEDIA_ASSET_PATH_OR_TYPE_INVALID");
    const content = readFileSync(file);
    if (hash(content) !== asset.sha256 || content.byteLength !== asset.byteLength) throw new Error("LOCAL_MEDIA_ASSET_PIN_MISMATCH");
    allowed.set(asset.filename, { bytes: new Uint8Array(content).buffer, mimeType: asset.mimeType });
  }
  app.get(`${config.route}/:filename`, (c) => {
    if (!["127.0.0.1", "localhost"].includes(new URL(c.req.url).hostname)) return c.notFound();
    const asset = allowed.get(c.req.param("filename"));
    if (!asset) return c.notFound();
    c.header("Content-Type", asset.mimeType);
    c.header("Content-Length", String(asset.bytes.byteLength));
    c.header("Cache-Control", "private, max-age=31536000, immutable");
    c.header("X-Content-Type-Options", "nosniff");
    return c.body(asset.bytes);
  });
}
